import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Lightbulb,
  ListChecks,
  PenLine,
  Search,
  Target,
  TriangleAlert,
} from 'lucide-react';
import type { QuestionView, Subject } from '@titanapt/shared';
import { apiData, messageFromError, newIdempotencyKey } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { Badge, EmptyState, ErrorState, Loader, PageHeader, ProgressBar, SectionHead } from '../components/ui';
import { subjectLabel, subjectShort } from '../lib/format';

type TopicListItem = {
  id: string;
  slug: string;
  name: string;
  subject: Subject;
  group: string;
  description: string;
  order: number;
  questionCount: number;
  lessonCount: number;
  lessons: Array<{ id: string; title: string; level: string; status: string; bestScore: number }>;
};

const subjectOrder: Subject[] = ['QUANTITATIVE', 'LOGICAL', 'VERBAL', 'DATA_INTERPRETATION'];

export function LearnPage() {
  useDocumentTitle('Learn');
  const { data, loading, error, reload } = useApi<TopicListItem[]>('/api/topics');
  const [subject, setSubject] = useState<Subject | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  const topics = useMemo(() => {
    if (!data) return [];
    return data.filter((topic) => {
      const matchesSubject = subject === 'ALL' || topic.subject === subject;
      const matchesQuery = !query.trim() || `${topic.name} ${topic.group} ${topic.description}`.toLowerCase().includes(query.trim().toLowerCase());
      return matchesSubject && matchesQuery;
    });
  }, [data, subject, query]);

  if (loading) return <Loader label="Loading the curriculum" />;
  if (error || !data) return <ErrorState message={error ?? 'Curriculum unavailable.'} onRetry={reload} />;

  const completedLessons = data.reduce((count, topic) => count + topic.lessons.filter((lesson) => lesson.status === 'COMPLETED').length, 0);
  const totalLessons = data.reduce((count, topic) => count + topic.lessonCount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Curriculum"
        title="Learn one thing properly."
        subtitle="Twenty-five focused lessons across the aptitude and reasoning chapters most placement tests draw from."
        actions={
          <Link to="/app/practice" className="btn btn-primary">
            Practise instead <ArrowRight size={16} />
          </Link>
        }
      />

      <section className="learn-overview panel">
        <div>
          <span className="stat-label">Lesson completion</span>
          <h2>{completedLessons} <span className="muted">of {totalLessons}</span></h2>
          <ProgressBar value={completedLessons} max={totalLessons} label="Lessons completed" />
        </div>
        <div className="learn-legend">
          {subjectOrder.map((item) => (
            <div key={item}>
              <span className={`subject-swatch swatch-${item.toLowerCase()}`} />
              <span>{subjectLabel[item]}</span>
              <strong>{data.filter((topic) => topic.subject === item).length}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="filter-bar">
        <div className="filter-tabs" role="tablist" aria-label="Filter by subject">
          <button type="button" className={subject === 'ALL' ? 'active' : ''} onClick={() => setSubject('ALL')}>All topics</button>
          {subjectOrder.map((item) => (
            <button type="button" key={item} className={subject === item ? 'active' : ''} onClick={() => setSubject(item)}>
              {subjectLabel[item]}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics" aria-label="Search topics" />
        </label>
      </div>

      {topics.length === 0 ? (
        <EmptyState title="No topics match that filter">Try a broader subject or clear the search.</EmptyState>
      ) : (
        <div className="topic-grid">
          {topics.map((topic) => {
            const completed = topic.lessons.filter((lesson) => lesson.status === 'COMPLETED').length;
            return (
              <Link to={`/app/learn/${topic.slug}`} className="topic-card" key={topic.id}>
                <div className="topic-card-top">
                  <span className={`subject-tag subject-${topic.subject.toLowerCase()}`}>{subjectShort[topic.subject]}</span>
                  <span className="topic-order">CH {String(topic.order).padStart(2, '0')}</span>
                </div>
                <h2>{topic.name}</h2>
                <p>{topic.description}</p>
                <div className="topic-meta">
                  <span><BookOpen size={14} /> {topic.lessonCount} lesson{topic.lessonCount === 1 ? '' : 's'}</span>
                  <span><ListChecks size={14} /> {topic.questionCount} questions</span>
                </div>
                <div className="topic-progress">
                  <ProgressBar value={completed} max={Math.max(1, topic.lessonCount)} />
                  <span>{completed === topic.lessonCount && topic.lessonCount > 0 ? <CheckCircle2 size={17} /> : `${completed}/${topic.lessonCount}`}</span>
                </div>
                <span className="topic-open">Open topic <ArrowRight size={15} /></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

type TopicDetail = {
  id: string;
  slug: string;
  name: string;
  subject: Subject;
  group: string;
  description: string;
  sourceNote: string | null;
  questionCount: number;
  lessons: Array<{
    id: string;
    title: string;
    level: string;
    order: number;
    progress: { status: string; bestScore: number; attemptsCount: number } | null;
  }>;
};

export function TopicPage() {
  const { topicSlug } = useParams();
  const { data, loading, error, reload } = useApi<TopicDetail>(topicSlug ? `/api/topics/${topicSlug}` : null);
  useDocumentTitle(data?.name ?? 'Topic');

  if (loading) return <Loader label="Loading topic" />;
  if (error || !data) return <ErrorState message={error ?? 'Topic unavailable.'} onRetry={reload} />;

  return (
    <div>
      <Link to="/app/learn" className="back-link"><ArrowLeft size={15} /> All topics</Link>
      <PageHeader
        eyebrow={`${subjectLabel[data.subject]} · ${data.group}`}
        title={data.name}
        subtitle={data.description}
        actions={
          <Link to={`/app/practice?topic=${data.slug}`} className="btn btn-primary">
            Practise this topic <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="topic-detail-grid">
        <section className="panel">
          <SectionHead title="Lessons" action={<span className="panel-note">{data.lessons.length} available</span>} />
          <div className="lesson-list">
            {data.lessons.map((lesson, index) => (
              <Link to={`/app/lessons/${lesson.id}`} className="lesson-row" key={lesson.id}>
                <span className={`lesson-index ${lesson.progress?.status === 'COMPLETED' ? 'done' : ''}`}>
                  {lesson.progress?.status === 'COMPLETED' ? <CheckCircle2 size={19} /> : String(index + 1).padStart(2, '0')}
                </span>
                <div className="lesson-row-copy">
                  <span className={`level level-${lesson.level.toLowerCase()}`}>{lesson.level}</span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.progress ? `${lesson.progress.status === 'COMPLETED' ? 'Completed' : 'In progress'} · best checkpoint ${lesson.progress.bestScore}` : 'Objective, worked examples, rules, mistakes and a verified checkpoint.'}</p>
                </div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        </section>

        <aside className="topic-aside">
          <div className="panel">
            <h3>Topic snapshot</h3>
            <dl className="fact-list">
              <div><dt>Subject</dt><dd>{subjectLabel[data.subject]}</dd></div>
              <div><dt>Group</dt><dd>{data.group}</dd></div>
              <div><dt>Lessons</dt><dd>{data.lessons.length}</dd></div>
              <div><dt>Verified questions</dt><dd>{data.questionCount}</dd></div>
              <div><dt>Chapter</dt><dd>{String(data.lessons[0]?.order ?? 0).padStart(2, '0')}</dd></div>
            </dl>
          </div>
          <div className="panel source-panel">
            <span className="eyebrow">Provenance</span>
            <p>{data.sourceNote ?? 'Chapter source recorded with each seeded question.'}</p>
            <small>Only approved questions with a verified correct option are counted.</small>
          </div>
        </aside>
      </div>
    </div>
  );
}

type LessonDetail = {
  id: string;
  slug: string;
  title: string;
  level: string;
  order: number;
  objective: string;
  explanation: string;
  analogy: string | null;
  workedExamples: Array<{ title: string; problem: string; steps: string[]; answer: string }>;
  rule: Array<{ title: string; detail: string }>;
  mistakes: Array<{ mistake: string; fix: string }>;
  memoryTip: string;
  practice: Array<{ prompt: string; answer: string }>;
  sourceRef: string;
  reviewer: string | null;
  topic: { id: string; slug: string; name: string; subject: Subject; description: string };
  checkpointQuestions: QuestionView[];
  progress: { status: string; bestScore: number; attemptsCount: number } | null;
};

type CheckpointResult = {
  correct: number;
  total: number;
  passed: boolean;
  idempotent: boolean;
  results: Array<{
    questionId: string;
    selectedOptionId: string | null;
    correctOptionId: string | null;
    isCorrect: boolean;
    explanation: string;
    reasoning: string | null;
    steps: unknown;
    shortcuts: string | null;
  }>;
};

export function LessonPage() {
  const { lessonId } = useParams();
  const { data, loading, error, reload } = useApi<LessonDetail>(lessonId ? `/api/lessons/${lessonId}` : null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CheckpointResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  useDocumentTitle(data?.title ?? 'Lesson');

  if (loading) return <Loader label="Opening lesson" />;
  if (error || !data) return <ErrorState message={error ?? 'Lesson unavailable.'} onRetry={reload} />;

  const allAnswered = data.checkpointQuestions.length > 0 && data.checkpointQuestions.every((question) => answers[question.id]);

  async function submitCheckpoint() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const response = await apiData<CheckpointResult>(`/api/lessons/${data!.id}/checkpoint`, {
        method: 'POST',
        body: {
          submissionKey: newIdempotencyKey('cp'),
          answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
        },
      });
      setResult(response);
      reload();
    } catch (err) {
      setSubmitError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function resultFor(questionId: string) {
    return result?.results.find((item) => item.questionId === questionId);
  }

  return (
    <div className="lesson-page">
      <Link to={`/app/learn/${data.topic.slug}`} className="back-link"><ArrowLeft size={15} /> {data.topic.name}</Link>
      <header className="lesson-header">
        <div className="lesson-header-meta">
          <span className={`level level-${data.level.toLowerCase()}`}>{data.level}</span>
          <span>{subjectLabel[data.topic.subject]}</span>
          <span>Lesson {String(data.order).padStart(2, '0')}</span>
          {data.progress?.status === 'COMPLETED' && <Badge tone="success"><CheckCircle2 size={13} /> Completed</Badge>}
        </div>
        <h1>{data.title}</h1>
        <p className="lesson-objective"><Target size={19} /> {data.objective}</p>
      </header>

      <div className="lesson-layout">
        <article className="lesson-article">
          <section className="lesson-section">
            <span className="lesson-section-number">01</span>
            <div>
              <h2>Understand the idea</h2>
              <p>{data.explanation}</p>
              {data.analogy && (
                <div className="analogy-card">
                  <Lightbulb size={20} />
                  <div><strong>Think of it this way</strong><p>{data.analogy}</p></div>
                </div>
              )}
            </div>
          </section>

          <section className="lesson-section">
            <span className="lesson-section-number">02</span>
            <div>
              <h2>Worked examples</h2>
              <div className="worked-list">
                {data.workedExamples.map((example, index) => (
                  <div className="worked-card" key={example.title}>
                    <span className="worked-label">Example {index + 1}</span>
                    <h3>{example.title}</h3>
                    <p className="worked-problem">{example.problem}</p>
                    <ol>
                      {example.steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                    <div className="worked-answer"><CheckCircle2 size={17} /><span>{example.answer}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lesson-section">
            <span className="lesson-section-number">03</span>
            <div>
              <h2>The rules worth keeping</h2>
              <div className="rule-grid">
                {data.rule.map((rule) => (
                  <div className="rule-card" key={rule.title}>
                    <strong>{rule.title}</strong>
                    <p>{rule.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lesson-section">
            <span className="lesson-section-number">04</span>
            <div>
              <h2>Where answers go wrong</h2>
              <div className="mistake-list">
                {data.mistakes.map((mistake) => (
                  <div className="mistake-row" key={mistake.mistake}>
                    <TriangleAlert size={18} />
                    <div>
                      <strong>{mistake.mistake}</strong>
                      <p>{mistake.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="memory-tip">
                <span>MEMORY CUE</span>
                <p>{data.memoryTip}</p>
              </div>
            </div>
          </section>

          <section className="lesson-section">
            <span className="lesson-section-number">05</span>
            <div>
              <h2>Try it without looking</h2>
              <div className="practice-prompts">
                {data.practice.map((practice, index) => (
                  <details key={practice.prompt}>
                    <summary><span>{index + 1}</span>{practice.prompt}<ChevronDown size={16} /></summary>
                    <p>{practice.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="lesson-section">
            <span className="lesson-section-number">06</span>
            <div>
              <h2>Verified checkpoint</h2>
              <p className="section-help">
                Answer every question to complete the lesson. You need at least two-thirds correct. The checkpoint uses
                approved questions with source-checked answers.
              </p>
              {data.checkpointQuestions.length === 0 ? (
                <EmptyState title="No checkpoint available">This lesson has no verified checkpoint questions yet.</EmptyState>
              ) : (
                <div className="checkpoint-stack">
                  {data.checkpointQuestions.map((question, index) => {
                    const questionResult = resultFor(question.id);
                    return (
                      <div className={`checkpoint-card ${questionResult ? (questionResult.isCorrect ? 'is-correct' : 'is-incorrect') : ''}`} key={question.id}>
                        <div className="checkpoint-head">
                          <span>Question {index + 1}</span>
                          <span className={`difficulty difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
                        </div>
                        <h3>{question.stem}</h3>
                        <div className="option-list">
                          {question.options.map((option) => {
                            const selected = answers[question.id] === option.id;
                            const isCorrectOption = questionResult && questionResult.correctOptionId === option.id;
                            return (
                              <label
                                key={option.id}
                                className={`option-row ${selected ? 'selected' : ''} ${questionResult && isCorrectOption ? 'correct' : ''} ${questionResult && selected && !questionResult.isCorrect ? 'incorrect' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={option.id}
                                  checked={selected}
                                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                                  disabled={Boolean(result)}
                                />
                                <span className="option-label">{option.label}</span>
                                <span>{option.text}</span>
                              </label>
                            );
                          })}
                        </div>
                        {questionResult && (
                          <div className="answer-explanation">
                            <strong>{questionResult.isCorrect ? 'Correct.' : 'Review this one.'}</strong>
                            <p>{questionResult.explanation}</p>
                            {questionResult.shortcuts && <p className="shortcut"><Lightbulb size={15} /> {questionResult.shortcuts}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {submitError && <div className="form-error" role="alert">{submitError}</div>}
                  {result ? (
                    <div className={`checkpoint-summary ${result.passed ? 'passed' : 'failed'}`}>
                      <div>
                        <span className="eyebrow">Checkpoint result</span>
                        <h3>{result.passed ? 'Checkpoint passed' : 'Not quite there yet'}</h3>
                        <p>{result.correct} of {result.total} correct. {result.passed ? 'The lesson is marked complete.' : 'Review the explanations and try the topic practice before returning.'}</p>
                      </div>
                      <div className="checkpoint-score">{result.correct}/{result.total}</div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setResult(null);
                          setAnswers({});
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-primary" disabled={!allAnswered || submitting} onClick={() => void submitCheckpoint()}>
                      {submitting ? 'Checking answers…' : allAnswered ? 'Submit checkpoint' : `Answer all ${data.checkpointQuestions.length} questions`}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </article>

        <aside className="lesson-aside">
          <div className="panel sticky-panel">
            <h3>Lesson notes</h3>
            <div className="lesson-aside-row"><Clock3 size={16} /><span>Focused reading</span><strong>10–15 min</strong></div>
            <div className="lesson-aside-row"><ListChecks size={16} /><span>Checkpoint</span><strong>{data.checkpointQuestions.length} questions</strong></div>
            <div className="lesson-aside-row"><PenLine size={16} /><span>Practice prompts</span><strong>{data.practice.length}</strong></div>
            <div className="lesson-aside-divider" />
            <h4>Source</h4>
            <p className="aside-source">{data.sourceRef}</p>
            {data.reviewer && <small>Review: {data.reviewer}</small>}
            <div className="lesson-aside-divider" />
            <Link to={`/app/practice?topic=${data.topic.slug}`} className="btn btn-secondary btn-block">Practise this topic</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
