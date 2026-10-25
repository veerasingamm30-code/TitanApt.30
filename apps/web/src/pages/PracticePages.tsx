import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Flag,
  Layers3,
  Lightbulb,
  ListChecks,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { QuestionView, Subject } from '@titanapt/shared';
import { apiData, messageFromError, newIdempotencyKey } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { Badge, EmptyState, ErrorState, Loader, PageHeader, ProgressBar } from '../components/ui';
import { formatPercent, subjectLabel } from '../lib/format';

type TopicOption = {
  id: string;
  slug: string;
  name: string;
  subject: Subject;
  questionCount: number;
};

const subjectMap: Record<string, Subject> = {
  QUANTITATIVE: 'QUANTITATIVE',
  LOGICAL: 'LOGICAL',
  VERBAL: 'VERBAL',
  DATA_INTERPRETATION: 'DATA_INTERPRETATION',
};

type SessionData = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  filters: { topicSlug?: string; subject?: Subject; difficulty?: string; count?: number };
  answeredCount: number;
  questionCount: number;
  questions: Array<QuestionView & { selectedOptionId: string | null; answeredAt: string | null }>;
};

type Feedback = {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string | null;
  isCorrect: boolean;
  explanation: string;
  reasoning: string | null;
  steps: Array<{ step: number; text: string }> | unknown;
  shortcuts: string | null;
  correctOption: { id: string; label: string; text: string } | null;
  idempotent: boolean;
};

export function PracticePage() {
  useDocumentTitle('Practice');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('topic') ?? '';
  const initialCompany = searchParams.get('company') ?? '';
  const initialCompanyName = searchParams.get('companyName') ?? '';
  const { data: topics, loading, error } = useApi<TopicOption[]>('/api/topics');
  const [subject, setSubject] = useState<Subject | ''>('');
  const [topicSlug, setTopicSlug] = useState(initialTopic);
  const [companySlug, setCompanySlug] = useState(initialCompany);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(10);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    if (!topics) return [];
    return subject ? topics.filter((topic) => topic.subject === subject) : topics;
  }, [topics, subject]);

  const availableCount = topicSlug
    ? topics?.find((topic) => topic.slug === topicSlug)?.questionCount ?? 0
    : topics?.reduce((sum, topic) => sum + topic.questionCount, 0) ?? 0;

  async function startSession() {
    setStartError(null);
    setStarting(true);
    try {
      const body: Record<string, unknown> = { count };
      if (topicSlug) body.topicSlug = topicSlug;
      else if (subject) body.subject = subject;
      if (companySlug) body.companySlug = companySlug;
      if (difficulty) body.difficulty = difficulty;
      const session = await apiData<{ id: string }>('/api/practice/sessions', { method: 'POST', body });
      navigate(`/app/practice/${session.id}`);
    } catch (err) {
      setStartError(messageFromError(err));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Adaptive practice"
        title="Choose the work, not the busywork."
        subtitle="Build a short set from verified questions. Every answer gives immediate reasoning, not just a score."
      />

      {loading ? (
        <Loader label="Loading practice options" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="practice-setup-grid">
          <section className="panel practice-form-panel">
            <h2>Build a practice set</h2>
            {companySlug && (
              <div className="company-focus-banner">
                <Building2 size={18} />
                <div>
                  <strong>Company focus: {companyName || companySlug}</strong>
                  <span>Questions are limited to topics mapped to this company.</span>
                </div>
                <button type="button" className="text-link" onClick={() => { setCompanySlug(''); setCompanyName(''); }}>Clear</button>
              </div>
            )}
            <div className="field">
              <span>Subject</span>
              <div className="choice-grid">
                <button type="button" className={`choice-card ${subject === '' ? 'selected' : ''}`} onClick={() => { setSubject(''); }}>
                  <Layers3 size={18} /><strong>Mixed</strong><small>All subjects</small>
                </button>
                {(Object.keys(subjectMap) as Subject[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={`choice-card ${subject === item ? 'selected' : ''}`}
                    onClick={() => {
                      setSubject(item);
                      const current = topics?.find((topic) => topic.slug === topicSlug);
                      if (current && current.subject !== item) setTopicSlug('');
                    }}
                  >
                    <span className={`subject-tag subject-${item.toLowerCase()}`}>{subjectLabel[item].slice(0, 2).toUpperCase()}</span>
                    <strong>{subjectLabel[item]}</strong>
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Topic <small>(optional)</small></span>
              <select value={topicSlug} onChange={(event) => setTopicSlug(event.target.value)}>
                <option value="">All {subject ? subjectLabel[subject].toLowerCase() : ''} topics</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.slug}>{topic.name} · {topic.questionCount} verified</option>
                ))}
              </select>
            </label>

            <div className="form-row">
              <label className="field">
                <span>Difficulty</span>
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option value="">Any difficulty</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </label>
              <label className="field">
                <span>Questions</span>
                <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
                  {[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value} questions</option>)}
                </select>
              </label>
            </div>

            {startError && <div className="form-error" role="alert">{startError}</div>}
            <button type="button" className="btn btn-primary btn-block" onClick={() => void startSession()} disabled={starting}>
              {starting ? 'Building your set…' : `Start ${count}-question practice`} <Play size={16} />
            </button>
            <p className="form-footnote">Only approved questions with a verified correct option can enter a set.</p>
          </section>

          <aside className="practice-summary-card">
            <span className="eyebrow">Current selection</span>
            <h3>{topicSlug ? topics?.find((topic) => topic.slug === topicSlug)?.name : companySlug ? `${companyName || 'Company'} focus` : subject ? subjectLabel[subject] : 'Mixed practice'}</h3>
            <dl className="fact-list">
              <div><dt>Questions requested</dt><dd>{count}</dd></div>
              <div><dt>Verified pool</dt><dd>{availableCount}</dd></div>
              <div><dt>Difficulty</dt><dd>{difficulty ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase() : 'Any'}</dd></div>
              <div><dt>Feedback</dt><dd>Immediate</dd></div>
            </dl>
            <div className="practice-note">
              <Lightbulb size={18} />
              <p>If you miss a question, read the reasoning before moving on. The explanation is the point of the set.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function PracticeSessionPage() {
  const { sessionId } = useParams();
  const { data, loading, error, reload } = useApi<SessionData>(sessionId ? `/api/practice/sessions/${sessionId}` : null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [flagNote, setFlagNote] = useState('');
  const [flagMessage, setFlagMessage] = useState<string | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const pendingKeys = useRef<Record<string, string>>({});
  useDocumentTitle('Practice session');

  useEffect(() => {
    if (!data || initialised) return;
    const answeredMap: Record<string, string> = {};
    data.questions.forEach((question) => {
      if (question.selectedOptionId) answeredMap[question.id] = question.selectedOptionId;
    });
    setAnswered(answeredMap);
    if (data.questions.every((question) => question.selectedOptionId)) setShowSummary(true);
    const firstUnanswered = data.questions.findIndex((question) => !question.selectedOptionId);
    setIndex(firstUnanswered >= 0 ? firstUnanswered : Math.max(0, data.questions.length - 1));
    setInitialised(true);
  }, [data, initialised]);

  useEffect(() => {
    apiData<Array<{ question: { id: string } }>>('/api/bookmarks')
      .then((rows) => setBookmarks(new Set(rows.map((row) => row.question.id))))
      .catch(() => setBookmarks(new Set()));
  }, []);

  if (loading) return <Loader label="Preparing your questions" />;
  if (error || !data) return <ErrorState message={error ?? 'Practice session unavailable.'} onRetry={reload} />;
  if (data.questions.length === 0) return <EmptyState title="This session has no questions">Start a new practice set.</EmptyState>;

  const question = data.questions[Math.min(index, data.questions.length - 1)];
  const answeredCount = Object.keys(answered).length;
  const allAnswered = answeredCount === data.questions.length;
  const currentFeedback = feedback[question.id];
  const currentCorrect = Object.values(feedback).filter((item) => item.isCorrect).length;
  const sessionIsResumed = data.answeredCount > 0 && Object.keys(feedback).length === 0;

  async function answer(optionId: string) {
    if (answered[question.id] || answering) return;
    setAnswerError(null);
    setAnswering(true);
    const key = pendingKeys.current[question.id] ?? newIdempotencyKey('practice');
    pendingKeys.current[question.id] = key;
    try {
      const result = await apiData<Feedback>(`/api/practice/sessions/${data!.id}/questions/${question.id}/answer`, {
        method: 'POST',
        body: { optionId, idempotencyKey: key },
      });
      setFeedback((current) => ({ ...current, [question.id]: result }));
      setAnswered((current) => ({ ...current, [question.id]: optionId }));
      delete pendingKeys.current[question.id];
    } catch (err) {
      setAnswerError(messageFromError(err));
    } finally {
      setAnswering(false);
    }
  }

  async function toggleBookmark() {
    const bookmarked = bookmarks.has(question.id);
    try {
      if (bookmarked) {
        await apiData(`/api/bookmarks/${question.id}`, { method: 'DELETE' });
        setBookmarks((current) => {
          const next = new Set(current);
          next.delete(question.id);
          return next;
        });
      } else {
        await apiData(`/api/bookmarks/${question.id}`, { method: 'POST' });
        setBookmarks((current) => new Set(current).add(question.id));
      }
    } catch (err) {
      setAnswerError(messageFromError(err));
    }
  }

  async function submitFlag() {
    setFlagMessage(null);
    if (flagNote.trim().length < 10) {
      setFlagMessage('Add at least 10 characters so a reviewer can investigate.');
      return;
    }
    try {
      await apiData(`/api/questions/${question.id}/flags`, { method: 'POST', body: { note: flagNote.trim() } });
      setFlagNote('');
      setFlagMessage('Report submitted for review.');
    } catch (err) {
      setFlagMessage(messageFromError(err));
    }
  }

  return (
    <div className="practice-session-page">
      <div className="session-topbar">
        <Link to="/app/practice" className="back-link"><ArrowLeft size={15} /> Exit practice</Link>
        <div className="session-progress">
          <span>{answeredCount} of {data.questions.length} answered</span>
          <ProgressBar value={answeredCount} max={data.questions.length} />
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIndex(0)}>Review from start</button>
      </div>

      {showSummary ? (
        <section className="session-complete panel">
          <CheckCircle2 size={34} />
          <span className="eyebrow">Practice complete</span>
          <h1>{answeredCount} of {data.questions.length} answered</h1>
          <p>
            {sessionIsResumed
              ? 'This set was already partly answered. Feedback appears only for questions answered in this visit.'
              : `You answered ${currentCorrect} correctly in this visit. Read any missed explanations before starting another set.`}
          </p>
          <div className="session-complete-actions">
            <Link to="/app/practice" className="btn btn-primary"><RotateCcw size={16} /> New practice set</Link>
            <Link to="/app/mocks" className="btn btn-secondary">Try a timed mock</Link>
          </div>
          <div className="session-review-list">
            {data.questions.map((item, itemIndex) => {
              const itemFeedback = feedback[item.id];
              return (
                <button type="button" key={item.id} className="session-review-row" onClick={() => { setIndex(itemIndex); setShowSummary(false); }}>
                  <span className={`result-dot ${itemFeedback ? (itemFeedback.isCorrect ? 'correct' : 'incorrect') : 'neutral'}`} />
                  <span>Q{itemIndex + 1} · {item.topic.name}</span>
                  <span>{itemFeedback ? (itemFeedback.isCorrect ? 'Correct' : 'Incorrect') : 'Answered earlier'}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="practice-session-grid">
          <section className="question-card panel">
            <div className="question-meta">
              <div>
                <span className={`subject-tag subject-${question.topic.subject.toLowerCase()}`}>{question.topic.subject.replace('_', ' ')}</span>
                <span className="question-topic">{question.topic.name}</span>
              </div>
              <div className="question-tools">
                <span className={`difficulty difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
                <button type="button" className="icon-btn" onClick={() => void toggleBookmark()} aria-label={bookmarks.has(question.id) ? 'Remove bookmark' : 'Bookmark question'}>
                  {bookmarks.has(question.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                </button>
              </div>
            </div>
            <h1>{question.stem}</h1>
            {question.statement && <p className="question-statement">{question.statement}</p>}

            <div className="option-list option-list-large">
              {question.options.map((option) => {
                const selected = answered[question.id] === option.id;
                const correctOption = currentFeedback?.correctOptionId === option.id;
                const wrongSelected = selected && currentFeedback && !currentFeedback.isCorrect;
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`option-button ${selected ? 'selected' : ''} ${correctOption ? 'correct' : ''} ${wrongSelected ? 'incorrect' : ''}`}
                    onClick={() => void answer(option.id)}
                    disabled={Boolean(answered[question.id]) || answering}
                  >
                    <span className="option-label">{option.label}</span>
                    <span>{option.text}</span>
                    {correctOption && <CheckCircle2 size={18} />}
                    {wrongSelected && <XCircle size={18} />}
                  </button>
                );
              })}
            </div>

            {answerError && <div className="form-error" role="alert">{answerError}</div>}

            {currentFeedback && (
              <div className={`feedback-panel ${currentFeedback.isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="feedback-head">
                  {currentFeedback.isCorrect ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
                  <strong>{currentFeedback.isCorrect ? 'Correct answer' : `Correct answer: ${currentFeedback.correctOption?.label ?? ''}`}</strong>
                </div>
                <p>{currentFeedback.explanation}</p>
                {currentFeedback.reasoning && <p className="feedback-reasoning">{currentFeedback.reasoning}</p>}
                {Array.isArray(currentFeedback.steps) && currentFeedback.steps.length > 0 && (
                  <ol className="feedback-steps">
                    {(currentFeedback.steps as Array<{ step: number; text: string }>).map((step) => <li key={step.step}>{step.text}</li>)}
                  </ol>
                )}
                {currentFeedback.shortcuts && <p className="shortcut"><Lightbulb size={15} /> {currentFeedback.shortcuts}</p>}
              </div>
            )}

            <div className="question-footer">
              <span className="source-line">Source: {question.sourceDocument}, page {question.sourcePage}</span>
              <div className="question-nav">
                <button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => { setIndex((value) => Math.max(0, value - 1)); setAnswerError(null); }}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => { setIndex((value) => Math.min(data.questions.length - 1, value + 1)); setAnswerError(null); }}
                  disabled={index === data.questions.length - 1}
                >
                  Next <ChevronRight size={16} />
                </button>
                {allAnswered && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSummary(true)}>View summary</button>}
              </div>
            </div>
          </section>

          <aside className="practice-aside">
            <div className="panel">
              <div className="aside-head"><h3>Question map</h3><span>{data.questions.length}</span></div>
              <div className="question-map">
                {data.questions.map((item, itemIndex) => {
                  const itemFeedback = feedback[item.id];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`map-cell ${itemIndex === index ? 'current' : ''} ${itemFeedback ? (itemFeedback.isCorrect ? 'correct' : 'incorrect') : answered[item.id] ? 'answered' : ''}`}
                      onClick={() => { setIndex(itemIndex); setAnswerError(null); }}
                      aria-label={`Question ${itemIndex + 1}${answered[item.id] ? ', answered' : ''}`}
                    >
                      {itemIndex + 1}
                    </button>
                  );
                })}
              </div>
              <div className="map-legend">
                <span><i className="legend-dot correct" /> Correct</span>
                <span><i className="legend-dot incorrect" /> Incorrect</span>
                <span><i className="legend-dot answered" /> Answered</span>
              </div>
            </div>

            <details className="panel report-panel">
              <summary><Flag size={16} /> Report a problem</summary>
              <p>Tell a reviewer what looks wrong. Reports are tied to the question and your account.</p>
              <textarea value={flagNote} onChange={(event) => setFlagNote(event.target.value)} placeholder="For example: the explanation appears to use the wrong denominator." rows={3} maxLength={500} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void submitFlag()}>Submit report</button>
              {flagMessage && <small>{flagMessage}</small>}
            </details>

            <div className="panel attempt-summary">
              <h3>This set</h3>
              <div className="attempt-summary-row"><span>Answered</span><strong>{answeredCount}/{data.questions.length}</strong></div>
              <div className="attempt-summary-row"><span>Correct this visit</span><strong>{currentCorrect}</strong></div>
              <div className="attempt-summary-row"><span>Feedback</span><strong>Immediate</strong></div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
