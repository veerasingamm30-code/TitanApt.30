import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';

const email = `integration.${randomUUID()}@example.com`;
const password = 'Integration#2026';
let learner: ReturnType<typeof request.agent>;
let csrf: string;
let companySlug: string;

function withCsrf(test: request.Test, token = csrf) {
  return test.set('x-csrf-token', token);
}

describe('TitanApt HTTP integration', () => {
  beforeAll(async () => {
    learner = request.agent(app);
    const bootstrap = await learner.get('/api/auth/csrf').expect(200);
    csrf = bootstrap.body.data.csrfToken;
    await withCsrf(
      learner
        .post('/api/auth/signup')
        .send({ displayName: 'Integration Learner', email, password }),
    ).expect(201);
  });

  it('reports a seeded, ready database', async () => {
    const response = await request(app).get('/health/ready').expect(200);
    expect(response.body.data.content).toMatchObject({
      topics: 25,
      approvedQuestions: 175,
      approvedLessons: 25,
      publishedMocks: 2,
    });
  });

  it('rejects unsafe requests without a CSRF header', async () => {
    await learner.post('/api/practice/sessions').send({ count: 5 }).expect(403);
  });

  it('authenticates the learner and blocks a duplicate email', async () => {
    const me = await learner.get('/api/auth/me').expect(200);
    expect(me.body.data.user.email).toBe(email);

    await withCsrf(
      learner
        .post('/api/auth/signup')
        .send({ displayName: 'Duplicate Learner', email, password }),
    ).expect(409);

    const dashboard = await learner.get('/api/dashboard').expect(200);
    expect(dashboard.body.data.dailyGoal.goal).toBe(10);
    expect(dashboard.body.data.recommendation).toHaveProperty('lessonId');
  });

  it('serves the catalogue and company profiles', async () => {
    const topics = await learner.get('/api/topics').expect(200);
    expect(topics.body.data).toHaveLength(25);

    const companies = await learner.get('/api/companies').expect(200);
    expect(companies.body.data).toHaveLength(25);
    const company = companies.body.data.find(
      (item: { topicSlugs: string[] }) => item.topicSlugs.length > 0,
    );
    expect(company).toBeTruthy();
    companySlug = company.slug;

    const detail = await learner.get(`/api/companies/${companySlug}`).expect(200);
    expect(detail.body.data.learningTopics.length).toBeGreaterThan(0);

    const readiness = await learner.get('/api/readiness').expect(200);
    expect(readiness.body.data.items).toHaveLength(10);
    const updated = await withCsrf(
      learner
        .patch(`/api/readiness/${readiness.body.data.items[0].key}`)
        .send({ completed: true }),
    ).expect(200);
    expect(updated.body.data.completed).toBe(true);
  });

  it('starts and answers practice sessions, including company focus', async () => {
    const started = await withCsrf(
      learner.post('/api/practice/sessions').send({ count: 5 }),
    ).expect(201);
    const question = started.body.data.questions[0];
    expect(started.body.data.questions).toHaveLength(5);

    const answered = await withCsrf(
      learner
        .post(
          `/api/practice/sessions/${started.body.data.id}/questions/${question.id}/answer`,
        )
        .send({
          optionId: question.options[0].id,
          idempotencyKey: `integration_${randomUUID()}`,
        }),
    ).expect(201);
    expect(answered.body.data).toHaveProperty('isCorrect');

    const companyPractice = await withCsrf(
      learner.post('/api/practice/sessions').send({ count: 5, companySlug }),
    ).expect(201);
    expect(companyPractice.body.data.questions).toHaveLength(5);

    const topics = await learner.get('/api/topics').expect(200);
    const topic = topics.body.data.find((item: { questionCount: number }) => item.questionCount >= 6);
    expect(topic).toBeTruthy();
    const firstTopicSession = await withCsrf(
      learner.post('/api/practice/sessions').send({ topicSlug: topic.slug, count: 5 }),
    ).expect(201);
    const firstQuestion = firstTopicSession.body.data.questions[0];
    await withCsrf(
      learner
        .post(`/api/practice/sessions/${firstTopicSession.body.data.id}/questions/${firstQuestion.id}/answer`)
        .send({
          optionId: firstQuestion.options[0].id,
          idempotencyKey: `integration_${randomUUID()}`,
        }),
    ).expect(201);
    const secondTopicSession = await withCsrf(
      learner.post('/api/practice/sessions').send({ topicSlug: topic.slug, count: 5 }),
    ).expect(201);
    expect(
      secondTopicSession.body.data.questions.map((item: { id: string }) => item.id),
    ).not.toContain(firstQuestion.id);
  });

  it('starts, saves and submits a timed mock', async () => {
    const mocks = await learner.get('/api/mocks').expect(200);
    const mock = mocks.body.data[0];
    const started = await withCsrf(
      learner.post(`/api/mocks/${mock.slug}/start`).send({}),
    ).expect(201);
    const attemptId = started.body.data.id;
    const question = started.body.data.questions[0];

    await withCsrf(
      learner
        .patch(`/api/mocks/attempts/${attemptId}/answer`)
        .send({ questionId: question.id, optionId: question.options[0].id }),
    ).expect(200);

    const submitted = await withCsrf(
      learner.post(`/api/mocks/attempts/${attemptId}/submit`).send({}),
    ).expect(201);
    expect(submitted.body.data.status).toBe('SUBMITTED');
    expect(submitted.body.data.score).toBeTypeOf('number');
  });

  it('enforces admin authorization', async () => {
    await learner.get('/api/admin/overview').expect(403);

    const admin = request.agent(app);
    const bootstrap = await admin.get('/api/auth/csrf').expect(200);
    const adminCsrf = bootstrap.body.data.csrfToken;
    await withCsrf(
      admin
        .post('/api/auth/login')
        .send({ email: 'admin@titanapt.local', password: 'TitanAptAdmin#2026' }),
      adminCsrf,
    ).expect(200);

    const overview = await admin.get('/api/admin/overview').expect(200);
    expect(overview.body.data.counts.approvedQuestions).toBeGreaterThanOrEqual(175);
    expect(overview.body.data.counts.pendingQuestions).toBeGreaterThanOrEqual(0);

    const run = await withCsrf(
      admin.post('/api/admin/imports/run').send({ chapter: 2, limit: 5 }),
      adminCsrf,
    ).expect(201);
    expect(run.body.data).toMatchObject({
      chapter: 2,
      candidateCount: 5,
      processedPages: expect.any(Number),
    });
    expect(run.body.data.importedCount + run.body.data.skippedCount).toBe(5);
    expect(run.body.data.importedCount).toBe(0);
  });
});
