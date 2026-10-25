import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileClock,
  ListChecks,
  Play,
  RotateCcw,
  Send,
  Timer,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import type { QuestionView, Subject } from '@titanapt/shared';
import { apiData, messageFromError } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { Badge, ErrorState, Loader, PageHeader, ProgressBar, SectionHead, StatCard } from '../components/ui';
import { formatClock, formatDateTime, formatPercent, subjectLabel } from '../lib/format';

type MockSection = { name: string; subject: Subject; count: number; difficulty?: string };
type Marking = { correct: number; incorrect: number; unanswered: number };

type MockSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  sections: MockSection[];
  marking: Marking;
  sourceNote: string | null;
  attempts: Array<{
    id: string;
    status: string;
    percentage: number | null;
    score: number | null;
    maxScore: number | null;
    startedAt: string;
    submittedAt: string | null;
  }>;
};

type MockDetail = Omit<MockSummary, 'attempts'> & {
  attempts: Array<{ id: string; status: string; percentage: number | null; startedAt: string; submittedAt: string | null }>;
};

function totalQuestions(mock: { sections: MockSection[] }) {
  return mock.sections.reduce((sum, section) => sum + section.count, 0);
}

export function MocksPage() {
  useDocumentTitle('Mock tests');
  const { data, loading, error, reload } = useApi<MockSummary[]>('/api/mocks');

  if (loading) return <Loader label="Loading mock tests" />;
  if (error || !data) return <ErrorState message={error ?? 'Mock tests unavailable.'} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Timed practice"
        title="Build exam stamina, not just knowledge."
        subtitle="Sectioned mock tests with a live countdown, answer saving, placement-style marking and a full review."
        actions={<Link to="/app/practice" className="btn btn-secondary">Untimed practice</Link>}
      />

      <div className="mock-note panel">
        <div>
          <TriangleAlert size={20} />
          <p>
            These are original TitanApt practice mocks assembled from approved seeded questions. They are not real
            company question papers and no real company logo is used.
          </p>
        </div>
        <span>Negative marking applies</span>
      </div>

      <div className="mock-grid">
        {data.map((mock) => {
          const latest = mock.attempts[0];
          const active = mock.attempts.find((attempt) => attempt.status === 'IN_PROGRESS');
          const submittedCount = mock.attempts.filter((attempt) => attempt.status === 'SUBMITTED').length;
          return (
            <article className="mock-card" key={mock.id}>
              <div className="mock-card-top">
                <span className="mock-icon"><FileClock size={22} /></span>
                <Badge tone={active ? 'warning' : 'info'}>{active ? 'In progress' : 'Published'}</Badge>
              </div>
              <h2>{mock.title}</h2>
              <p>{mock.description}</p>
              <div className="mock-facts">
                <span><Clock3 size={15} /> {mock.durationMinutes} min</span>
                <span><ListChecks size={15} /> {totalQuestions(mock)} questions</span>
                <span><Layers3Icon /> {mock.sections.length} sections</span>
              </div>
              <div className="section-chip-row">
                {mock.sections.map((section) => (
                  <span key={section.name} className={`subject-tag subject-${section.subject.toLowerCase()}`}>{section.name} · {section.count}</span>
                ))}
              </div>
              <div className="mock-marking">
                <span>+{mock.marking.correct} correct</span>
                <span>{mock.marking.incorrect} incorrect</span>
                <span>{mock.marking.unanswered} unanswered</span>
              </div>
              <div className="mock-card-foot">
                <div>
                  <strong>{submittedCount}</strong>
                  <small>completed attempt{submittedCount === 1 ? '' : 's'}</small>
                </div>
                <div className="mock-actions">
                  {latest?.status === 'SUBMITTED' && <Link to={`/app/mocks/attempts/${latest.id}`} className="btn btn-ghost btn-sm">Last result</Link>}
                  <Link to={`/app/mocks/${mock.slug}`} className="btn btn-primary btn-sm">
                    {active ? 'Resume' : 'View & start'} <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Layers3Icon() {
  return <span className="inline-icon">▦</span>;
}

export function MockDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<MockDetail>(slug ? `/api/mocks/${slug}` : null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  useDocumentTitle(data?.title ?? 'Mock test');

  if (loading) return <Loader label="Loading mock test" />;
  if (error || !data) return <ErrorState message={error ?? 'Mock test unavailable.'} onRetry={reload} />;

  async function start() {
    setStarting(true);
    setStartError(null);
    try {
      const attempt = await apiData<{ id: string }>(`/api/mocks/${data!.slug}/start`, { method: 'POST' });
      navigate(`/app/mocks/attempts/${attempt.id}`);
    } catch (err) {
      setStartError(messageFromError(err));
    } finally {
      setStarting(false);
    }
  }

  const active = data.attempts.find((attempt) => attempt.status === 'IN_PROGRESS');
  const questions = totalQuestions(data);

  return (
    <div>
      <Link to="/app/mocks" className="back-link"><ArrowLeft size={15} /> All mock tests</Link>
      <PageHeader
        eyebrow="Mock test briefing"
        title={data.title}
        subtitle={data.description}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => void start()} disabled={starting}>
            {starting ? 'Starting…' : active ? 'Resume attempt' : 'Start timed mock'} <Play size={16} />
          </button>
        }
      />

      <div className="mock-detail-grid">
        <section className="panel">
          <SectionHead title="Paper structure" action={<span className="panel-note">{questions} questions · {data.durationMinutes} minutes</span>} />
          <div className="mock-section-list">
            {data.sections.map((section, index) => (
              <div className="mock-section-row" key={section.name}>
                <span className="mock-section-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{section.name}</strong>
                  <small>{subjectLabel[section.subject]}</small>
                </div>
                <span>{section.count} questions</span>
              </div>
            ))}
          </div>
          <div className="mock-marking-detail">
            <div><span>Correct</span><strong>+{data.marking.correct}</strong></div>
            <div><span>Incorrect</span><strong>{data.marking.incorrect}</strong></div>
            <div><span>Unanswered</span><strong>{data.marking.unanswered}</strong></div>
          </div>
        </section>

        <aside className="mock-brief">
          <div className="panel">
            <h3>Before you begin</h3>
            <ul className="check-list">
              <li><CheckCircle2 size={16} /> The timer runs from the moment you start.</li>
              <li><CheckCircle2 size={16} /> Answers save automatically as you select them.</li>
              <li><CheckCircle2 size={16} /> Your score is calculated when you submit.</li>
              <li><CheckCircle2 size={16} /> You can review every explanation after submission.</li>
            </ul>
            <button type="button" className="btn btn-primary btn-block" onClick={() => void start()} disabled={starting}>
              {active ? 'Resume attempt' : 'Begin now'} <ArrowRight size={16} />
            </button>
            {startError && <div className="form-error" role="alert">{startError}</div>}
          </div>
          {data.attempts.length > 0 && (
            <div className="panel">
              <h3>Attempt history</h3>
              <div className="attempt-history">
                {data.attempts.map((attempt) => (
                  <Link to={`/app/mocks/attempts/${attempt.id}`} key={attempt.id} className="attempt-history-row">
                    <div>
                      <strong>{attempt.status === 'SUBMITTED' ? formatPercent(attempt.percentage) : attempt.status.replace('_', ' ')}</strong>
                      <small>{formatDateTime(attempt.startedAt)}</small>
                    </div>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="panel source-panel">
            <span className="eyebrow">Source note</span>
            <p>{data.sourceNote}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

type AttemptQuestion = QuestionView & {
  position: number;
  selectedOptionId: string | null;
  correctOptionId?: string | null;
  explanation?: string;
  steps?: unknown;
};

type MockAttempt = {
  id: string;
  status: string;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  secondsRemaining: number;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  mock: {
    slug: string;
    title: string;
    description: string;
    durationMinutes: number;
    sections: MockSection[];
    marking: Marking;
    sourceNote: string | null;
  };
  questions: AttemptQuestion[];
  correct?: number;
  incorrect?: number;
  unanswered?: number;
  idempotent?: boolean;
  resumed?: boolean;
};

export function MockAttemptPage() {
  const { attemptId } = useParams();
  const { data, loading, error, reload } = useApi<MockAttempt>(attemptId ? `/api/mocks/attempts/${attemptId}` : null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<MockAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const submitLock = useRef(false);
  useDocumentTitle(data?.mock.title ?? 'Mock attempt');

  useEffect(() => {
    if (!data || initialised) return;
    const map: Record<string, string | null> = {};
    data.questions.forEach((question) => {
      map[question.id] = question.selectedOptionId;
    });
    setAnswers(map);
    setInitialised(true);
    if (data.status === 'SUBMITTED') setResult(data);
  }, [data, initialised]);

  const active = data && data.status === 'IN_PROGRESS' && !result;
  const remaining = active ? Math.max(0, Math.floor((new Date(data!.deadlineAt).getTime() - now) / 1000)) : 0;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active || remaining > 0 || submitLock.current) return;
    void submitAttempt(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, remaining]);

  if (loading) return <Loader label="Opening attempt" />;
  if (error || !data) return <ErrorState message={error ?? 'Attempt unavailable.'} onRetry={reload} />;

  if (result) {
    return <MockResult attempt={result} />;
  }

  if (data.status === 'EXPIRED') {
    return (
      <div className="panel result-submit-panel">
        <TriangleAlert size={30} />
        <h1>Time expired</h1>
        <p>Your saved answers can still be scored. Submit the attempt to see the result.</p>
        <button type="button" className="btn btn-primary" onClick={() => void submitAttempt(false)} disabled={submitting}>
          {submitting ? 'Scoring…' : 'View my score'} <Send size={16} />
        </button>
      </div>
    );
  }

  const question = data.questions[Math.min(index, data.questions.length - 1)];
  const answeredCount = data.questions.filter((item) => answers[item.id]).length;
  const isLast = index === data.questions.length - 1;

  async function choose(optionId: string | null) {
    if (!question || !active) return;
    const previous = answers[question.id] ?? null;
    if (previous === optionId) return;
    setAnswers((current) => ({ ...current, [question.id]: optionId }));
    setSaving(true);
    setSaveError(null);
    try {
      await apiData(`/api/mocks/attempts/${data!.id}/answer`, {
        method: 'PATCH',
        body: { questionId: question.id, optionId },
      });
    } catch (err) {
      setAnswers((current) => ({ ...current, [question.id]: previous }));
      setSaveError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitAttempt(auto = false) {
    if (submitLock.current) return;
    const unanswered = data!.questions.length - answeredCount;
    if (!auto && unanswered > 0) {
      const confirmed = window.confirm(`You still have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`);
      if (!confirmed) return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSaveError(null);
    try {
      const scored = await apiData<MockAttempt>(`/api/mocks/attempts/${data!.id}/submit`, { method: 'POST' });
      setResult(scored);
    } catch (err) {
      setSaveError(messageFromError(err));
      submitLock.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mock-attempt-page">
      <div className="session-topbar mock-topbar">
        <Link to="/app/mocks" className="back-link"><ArrowLeft size={15} /> Exit attempt</Link>
        <div className="mock-title-center">
          <strong>{data.mock.title}</strong>
          <span>{answeredCount}/{data.questions.length} answered {saving ? '· saving…' : ''}</span>
        </div>
        <div className={`countdown ${remaining < 300 ? 'countdown-warning' : ''}`}>
          <Timer size={17} />
          <span>{formatClock(remaining)}</span>
        </div>
      </div>

      <div className="mock-attempt-grid">
        <section className="question-card panel">
          <div className="question-meta">
            <div>
              <span className={`subject-tag subject-${question.topic.subject.toLowerCase()}`}>{question.topic.subject.replace('_', ' ')}</span>
              <span className="question-topic">Question {index + 1} of {data.questions.length}</span>
            </div>
            <span className={`difficulty difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
          </div>
          <h1>{question.stem}</h1>
          {question.statement && <p className="question-statement">{question.statement}</p>}
          <div className="option-list option-list-large">
            {question.options.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`option-button ${answers[question.id] === option.id ? 'selected' : ''}`}
                onClick={() => void choose(option.id)}
                disabled={submitting}
              >
                <span className="option-label">{option.label}</span>
                <span>{option.text}</span>
              </button>
            ))}
          </div>
          {answers[question.id] && (
            <button type="button" className="clear-answer" onClick={() => void choose(null)} disabled={submitting}>
              Clear response
            </button>
          )}
          {saveError && <div className="form-error" role="alert">{saveError}</div>}
          <div className="question-footer">
            <span className="source-line">Marks are revealed only after submission.</span>
            <div className="question-nav">
              <button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>
                <ChevronLeft size={16} /> Previous
              </button>
              {isLast ? (
                <button type="button" className="btn btn-accent btn-sm" onClick={() => void submitAttempt(false)} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit test'} <Send size={15} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setIndex((value) => Math.min(data.questions.length - 1, value + 1))}>
                  Save & next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="mock-palette">
          <div className="panel">
            <div className="aside-head"><h3>Question palette</h3><span>{remaining < 300 ? 'Hurry' : 'On track'}</span></div>
            <div className="question-map">
              {data.questions.map((item, itemIndex) => (
                <button
                  type="button"
                  key={item.id}
                  className={`map-cell ${itemIndex === index ? 'current' : ''} ${answers[item.id] ? 'answered' : ''}`}
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Question ${itemIndex + 1}${answers[item.id] ? ', answered' : ', unanswered'}`}
                >
                  {itemIndex + 1}
                </button>
              ))}
            </div>
            <div className="map-legend">
              <span><i className="legend-dot answered" /> Answered</span>
              <span><i className="legend-dot current" /> Current</span>
            </div>
            <div className="palette-summary">
              <div><span>Answered</span><strong>{answeredCount}</strong></div>
              <div><span>Remaining</span><strong>{data.questions.length - answeredCount}</strong></div>
              <div><span>Total</span><strong>{data.questions.length}</strong></div>
            </div>
            <button type="button" className="btn btn-accent btn-block" onClick={() => void submitAttempt(false)} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit test'} <Send size={15} />
            </button>
          </div>
          <div className="panel source-panel">
            <span className="eyebrow">Mock note</span>
            <p>{data.mock.sourceNote}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MockResult({ attempt }: { attempt: MockAttempt }) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const correct = attempt.correct ?? attempt.questions.filter((q) => q.selectedOptionId && q.selectedOptionId === q.correctOptionId).length;
  const unanswered = attempt.unanswered ?? attempt.questions.filter((q) => !q.selectedOptionId).length;
  const incorrect = attempt.incorrect ?? Math.max(0, attempt.questions.length - correct - unanswered);
  const bySubject = new Map<Subject, { total: number; correct: number }>();
  for (const question of attempt.questions) {
    const entry = bySubject.get(question.topic.subject) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (question.selectedOptionId === question.correctOptionId) entry.correct += 1;
    bySubject.set(question.topic.subject, entry);
  }
  const filtered = attempt.questions.filter((question) => {
    if (filter === 'correct') return question.selectedOptionId === question.correctOptionId;
    if (filter === 'incorrect') return question.selectedOptionId && question.selectedOptionId !== question.correctOptionId;
    if (filter === 'unanswered') return !question.selectedOptionId;
    return true;
  });
  const [retaking, setRetaking] = useState(false);

  async function retake() {
    setRetaking(true);
    try {
      const next = await apiData<{ id: string }>(`/api/mocks/${attempt.mock.slug}/start`, { method: 'POST' });
      window.location.assign(`/app/mocks/attempts/${next.id}`);
    } catch {
      setRetaking(false);
    }
  }

  return (
    <div className="mock-result-page">
      <Link to="/app/mocks" className="back-link"><ArrowLeft size={15} /> All mock tests</Link>
      <header className="result-hero">
        <div>
          <span className="eyebrow">Mock submitted</span>
          <h1>{attempt.mock.title}</h1>
          <p>Submitted {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'just now'}. The review below explains every answer.</p>
        </div>
        <div className="result-score">
          <span>YOUR SCORE</span>
          <strong>{attempt.score ?? 0}<small>/{attempt.maxScore ?? attempt.questions.length}</small></strong>
          <em>{formatPercent(attempt.percentage)}</em>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard label="Correct" value={correct} note="including saved answers" />
        <StatCard label="Incorrect" value={incorrect} note={`${attempt.mock.marking.incorrect} per wrong answer`} />
        <StatCard label="Unanswered" value={unanswered} note={`${attempt.mock.marking.unanswered} per blank`} />
        <StatCard label="Percentage" value={formatPercent(attempt.percentage)} note="of the maximum score" />
      </div>

      <div className="result-columns">
        <section className="panel">
          <SectionHead title="Section performance" />
          <div className="subject-list">
            {[...bySubject.entries()].map(([subject, stats]) => (
              <div className="subject-row" key={subject}>
                <div className="subject-row-top">
                  <div><strong>{subjectLabel[subject]}</strong><small>{stats.correct}/{stats.total} correct</small></div>
                  <strong>{formatPercent((stats.correct / stats.total) * 100)}</strong>
                </div>
                <ProgressBar value={stats.correct} max={stats.total} />
              </div>
            ))}
          </div>
          <div className="result-actions">
            <button type="button" className="btn btn-primary" onClick={() => void retake()} disabled={retaking}>
              <RotateCcw size={16} /> {retaking ? 'Preparing…' : 'Retake this mock'}
            </button>
            <Link to="/app/practice" className="btn btn-secondary">Practise weak topics</Link>
          </div>
        </section>

        <aside className="panel result-note">
          <h3>Read the review properly</h3>
          <p>Your score is a snapshot. The useful part is recognising the error pattern: concept gap, calculation slip, misread question or time pressure.</p>
          <div className="result-note-row"><span>Marking</span><strong>+{attempt.mock.marking.correct} / {attempt.mock.marking.incorrect} / {attempt.mock.marking.unanswered}</strong></div>
          <div className="result-note-row"><span>Questions</span><strong>{attempt.questions.length}</strong></div>
          <div className="result-note-row"><span>Status</span><strong>Submitted</strong></div>
        </aside>
      </div>

      <section className="panel review-panel">
        <SectionHead
          title="Answer review"
          action={
            <div className="filter-tabs filter-tabs-small">
              {(['all', 'correct', 'incorrect', 'unanswered'] as const).map((value) => (
                <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          }
        />
        <div className="review-question-list">
          {filtered.length === 0 && <p className="muted">No questions in this filter.</p>}
          {filtered.map((question) => {
            const isCorrect = question.selectedOptionId === question.correctOptionId;
            const selected = question.options.find((option) => option.id === question.selectedOptionId);
            const correctOption = question.options.find((option) => option.id === question.correctOptionId);
            return (
              <details className={`review-question ${isCorrect ? 'is-correct' : question.selectedOptionId ? 'is-incorrect' : 'is-unanswered'}`} key={question.id}>
                <summary>
                  <span className="review-status">{isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}</span>
                  <span className="review-number">Q{question.position}</span>
                  <span className="review-stem">{question.stem}</span>
                  <span className={`subject-tag subject-${question.topic.subject.toLowerCase()}`}>{question.topic.subject.replace('_', ' ')}</span>
                </summary>
                <div className="review-body">
                  <p className="review-meta-line">Your answer: <strong>{selected ? `${selected.label}. ${selected.text}` : 'Not answered'}</strong></p>
                  <p className="review-meta-line">Correct answer: <strong>{correctOption ? `${correctOption.label}. ${correctOption.text}` : '—'}</strong></p>
                  {question.explanation && <p className="review-explanation">{question.explanation}</p>}
                  <Link to={`/app/learn/${question.topic.slug}`} className="text-link">Review {question.topic.name} <ArrowRight size={14} /></Link>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
