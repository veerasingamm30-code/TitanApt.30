import 'dotenv/config';

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@titanapt.local';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'TitanAptAdmin#2026';
const learnerEmail = `smoke.${Date.now()}@example.com`;
const learnerPassword = 'SmokeTest#2026';

class Client {
  cookies = new Map();

  cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  storeCookies(response) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';', 1)[0];
      const index = pair.indexOf('=');
      if (index > 0) this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }

  async request(path, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const headers = {};
    if (this.cookies.size > 0) headers.cookie = this.cookieHeader();
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrf = this.cookies.get('ta_csrf');
      if (!csrf) throw new Error(`No CSRF cookie available for ${method} ${path}`);
      headers['x-csrf-token'] = csrf;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: 'manual',
    });
    this.storeCookies(response);
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const expected = options.expect ?? 200;
    if (response.status !== expected) {
      throw new Error(
        `${method} ${path} returned ${response.status}, expected ${expected}: ${text.slice(0, 500)}`,
      );
    }
    return { status: response.status, body, text, headers: response.headers };
  }

  async csrf() {
    await this.request('/api/auth/csrf', { expect: 200 });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`[smoke] Target ${baseUrl}`);

  const anonymous = await fetch(`${baseUrl}/health/ready`);
  assert(anonymous.ok, `Health readiness returned ${anonymous.status}`);
  const health = await anonymous.json();
  assert(health.data.database.connected === true, 'Database readiness is not connected');
  assert(health.data.content.approvedQuestions >= 175, 'Approved question count is below 175');

  const landing = await fetch(`${baseUrl}/`);
  assert(landing.ok, `Landing page returned ${landing.status}`);
  assert((landing.headers.get('content-type') ?? '').includes('text/html'), 'Landing page is not HTML');
  const spa = await fetch(`${baseUrl}/app/dashboard`);
  assert(spa.ok, `SPA fallback returned ${spa.status}`);
  assert((spa.headers.get('content-type') ?? '').includes('text/html'), 'SPA fallback is not HTML');
  console.log('[smoke] Health, landing page, and SPA fallback passed');

  const learner = new Client();
  await learner.csrf();
  await learner.request('/api/auth/signup', {
    method: 'POST',
    expect: 201,
    body: { displayName: 'Smoke Learner', email: learnerEmail, password: learnerPassword },
  });
  const me = await learner.request('/api/auth/me');
  assert(me.body.data.user.email === learnerEmail, 'Learner session email mismatch');
  const dashboard = await learner.request('/api/dashboard');
  assert(dashboard.body.data.dailyGoal.goal === 10, 'Dashboard daily goal mismatch');
  console.log('[smoke] Signup, session, and dashboard passed');

  const topics = await learner.request('/api/topics');
  assert(topics.body.data.length === 25, 'Expected 25 topics');
  const companies = await learner.request('/api/companies');
  assert(companies.body.data.length === 25, 'Expected 25 companies');
  const company = companies.body.data.find((item) => item.topicSlugs.length > 0);
  assert(company, 'No company has mapped learning topics');
  const readiness = await learner.request('/api/readiness');
  assert(readiness.body.data.items.length === 10, 'Expected 10 readiness items');
  await learner.request(`/api/readiness/${readiness.body.data.items[0].key}`, {
    method: 'PATCH',
    body: { completed: true },
  });
  const companyPractice = await learner.request('/api/practice/sessions', {
    method: 'POST',
    expect: 201,
    body: { count: 5, companySlug: company.slug },
  });
  assert(companyPractice.body.data.questions.length === 5, 'Company practice question count mismatch');
  console.log('[smoke] Topics, companies, readiness, and company practice passed');

  const practice = await learner.request('/api/practice/sessions', {
    method: 'POST',
    expect: 201,
    body: { count: 5 },
  });
  assert(practice.body.data.questions.length === 5, 'Practice session question count mismatch');
  const practiceQuestion = practice.body.data.questions[0];
  const answered = await learner.request(
    `/api/practice/sessions/${practice.body.data.id}/questions/${practiceQuestion.id}/answer`,
    {
      method: 'POST',
      expect: 201,
      body: {
        optionId: practiceQuestion.options[0].id,
        idempotencyKey: `smoke_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      },
    },
  );
  assert(typeof answered.body.data.isCorrect === 'boolean', 'Practice answer did not return feedback');
  console.log('[smoke] Practice session and answer passed');

  const mocks = await learner.request('/api/mocks');
  assert(mocks.body.data.length >= 2, 'Expected at least two published mocks');
  const mock = mocks.body.data[0];
  const started = await learner.request(`/api/mocks/${mock.slug}/start`, {
    method: 'POST',
    expect: 201,
    body: {},
  });
  const attemptId = started.body.data.id;
  const mockQuestion = started.body.data.questions[0];
  await learner.request(`/api/mocks/attempts/${attemptId}/answer`, {
    method: 'PATCH',
    body: { questionId: mockQuestion.id, optionId: mockQuestion.options[0].id },
  });
  const submitted = await learner.request(`/api/mocks/attempts/${attemptId}/submit`, {
    method: 'POST',
    expect: 201,
    body: {},
  });
  assert(submitted.body.data.status === 'SUBMITTED', 'Mock attempt was not submitted');
  assert(typeof submitted.body.data.score === 'number', 'Mock score is missing');
  console.log('[smoke] Mock start, answer, and submit passed');

  await learner.request('/api/admin/overview', { expect: 403 });
  console.log('[smoke] Learner admin denial passed');

  const admin = new Client();
  await admin.csrf();
  await admin.request('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  const overview = await admin.request('/api/admin/overview');
  assert(overview.body.data.counts.approvedQuestions >= 175, 'Admin overview approved count mismatch');
  await admin.request('/api/admin/imports');
  console.log('[smoke] Admin login, overview, and import registry passed');

  console.log(`[smoke] PASS — learner ${learnerEmail}`);
}

main().catch((error) => {
  console.error('[smoke] FAIL:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
