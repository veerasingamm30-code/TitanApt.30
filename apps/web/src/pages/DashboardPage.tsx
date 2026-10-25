import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Clock3,
  Flame,
  Layers3,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { Subject } from '@titanapt/shared';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { ErrorState, Loader, PageHeader, ProgressBar, SectionHead, StatCard } from '../components/ui';
import { formatDateTime, formatPercent, subjectLabel } from '../lib/format';

type Dashboard = {
  user: { displayName: string; email: string; timezone: string; dailyGoal: number; targetExam: string | null };
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number | null;
    lessonsCompleted: number;
    lessonsTotal: number;
    topicsCompleted: number;
    topicsTotal: number;
    mockAttempts: number;
    bookmarks: number;
    weeklySolved: number;
  };
  dailyGoal: { date: string; completed: number; goal: number };
  streak: { current: number; longest: number; rule: string };
  activity: Array<{ date: string; count: number }>;
  subjects: Array<{ subject: Subject; topics: number; lessons: number; completedTopics: number; attempts: number; accuracy: number | null }>;
  weakAreas: Array<{ slug: string; name: string; subject: Subject; attempts: number; accuracy: number | null }>;
  recommendation: { lessonId: string; title: string; level: string; topic: { slug: string; name: string; subject: Subject } } | null;
  focusTopics: Array<{ slug: string; name: string; subject: Subject; attempts: number; accuracy: number | null }>;
  recentAttempts: Array<{ questionId: string; isCorrect: boolean; answeredAt: string; topic: { name: string; slug: string } }>;
  mockHistory: Array<{ id: string; title: string; slug: string; score: number | null; maxScore: number | null; percentage: number | null; submittedAt: string | null }>;
  availableMocks: Array<{ id: string; slug: string; title: string; description: string; durationMinutes: number }>;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { data, loading, error, reload } = useApi<Dashboard>('/api/dashboard');
  const [first] = (data?.user.displayName ?? 'there').split(' ');

  if (loading) return <Loader label="Opening your workspace" />;
  if (error || !data) return <ErrorState message={error ?? 'Dashboard unavailable.'} onRetry={reload} />;

  const goalPercent = data.dailyGoal.goal > 0 ? Math.min(100, (data.dailyGoal.completed / data.dailyGoal.goal) * 100) : 0;
  const newLearner = data.stats.totalAttempts === 0 && data.stats.lessonsCompleted === 0;
  const maxActivity = Math.max(1, ...data.activity.map((day) => day.count));

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={formatDateTime(new Date()).toUpperCase()}
        title={`${greeting()}, ${first}.`}
        subtitle={newLearner ? 'Your workspace is ready. Start with one lesson or a short diagnostic mock.' : 'Here is the clearest next move based on your recent work.'}
        actions={
          <Link to="/app/practice" className="btn btn-primary">
            <Plus size={16} /> New practice
          </Link>
        }
      />

      <section className="dashboard-hero-grid">
        <article className="next-action-card">
          <div className="next-action-top">
            <span className="pill pill-light"><Sparkles size={14} /> Recommended next</span>
            {data.recommendation && <span className={`level level-${data.recommendation.level.toLowerCase()}`}>{data.recommendation.level}</span>}
          </div>
          {data.recommendation ? (
            <>
              <span className="next-topic">{subjectLabel[data.recommendation.topic.subject]} · {data.recommendation.topic.name}</span>
              <h2>{data.recommendation.title}</h2>
              <p>
                A focused lesson with worked examples and a verified checkpoint. Finish it, then reinforce it with a
                short practice set.
              </p>
              <div className="next-actions">
                <Link to={`/app/lessons/${data.recommendation.lessonId}`} className="btn btn-accent">
                  Start lesson <ArrowRight size={16} />
                </Link>
                <Link to={`/app/learn/${data.recommendation.topic.slug}`} className="btn btn-outline-light">
                  View topic
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>You have completed every seeded lesson.</h2>
              <p>Use mock tests and bookmarked questions to keep your accuracy sharp.</p>
              <Link to="/app/mocks" className="btn btn-accent">Take a mock <ArrowRight size={16} /></Link>
            </>
          )}
        </article>

        <article className="daily-goal-card">
          <div className="daily-goal-head">
            <div>
              <span className="stat-label">Today’s goal</span>
              <h2>{data.dailyGoal.completed} <span>/ {data.dailyGoal.goal}</span></h2>
              <p>questions answered</p>
            </div>
            <div className="goal-ring" style={{ background: `conic-gradient(var(--teal) ${goalPercent}%, var(--line) 0)` }}>
              <span>{Math.round(goalPercent)}%</span>
            </div>
          </div>
          <div className="streak-row">
            <span className="streak-icon"><Flame size={19} /></span>
            <div>
              <strong>{data.streak.current}-day streak</strong>
              <small>Longest: {data.streak.longest} days</small>
            </div>
          </div>
          <div className="activity-mini" aria-label="Activity over the last 14 days">
            {data.activity.map((day) => (
              <span
                key={day.date}
                title={`${day.date}: ${day.count} activities`}
                className={day.count > 0 ? 'active' : ''}
                style={{ opacity: day.count ? 0.35 + (day.count / maxActivity) * 0.65 : 1 }}
              />
            ))}
          </div>
          <details className="streak-rule">
            <summary>How streaks work</summary>
            <p>{data.streak.rule}</p>
          </details>
        </article>
      </section>

      <section className="stat-grid">
        <StatCard label="Overall accuracy" value={formatPercent(data.stats.accuracy)} note={`${data.stats.correctAttempts} correct from ${data.stats.totalAttempts}`} />
        <StatCard label="This week" value={data.stats.weeklySolved} note="questions answered in the last 7 days" />
        <StatCard label="Lessons completed" value={`${data.stats.lessonsCompleted}/${data.stats.lessonsTotal}`} note={`${data.stats.topicsCompleted} of ${data.stats.topicsTotal} topics touched`} />
        <StatCard label="Mock tests" value={data.stats.mockAttempts} note={`${data.stats.bookmarks} bookmarked questions`} />
      </section>

      <div className="dashboard-columns">
        <section className="panel">
          <SectionHead title="Subject health" action={<Link to="/app/progress" className="text-link">Full progress <ArrowRight size={14} /></Link>} />
          <div className="subject-list">
            {data.subjects.map((subject) => (
              <div className="subject-row" key={subject.subject}>
                <div className="subject-row-top">
                  <div>
                    <strong>{subjectLabel[subject.subject]}</strong>
                    <small>{subject.completedTopics}/{subject.topics} topics touched · {subject.attempts} attempts</small>
                  </div>
                  <div className="subject-score">
                    {subject.accuracy === null ? <span className="muted">No data</span> : <strong>{formatPercent(subject.accuracy)}</strong>}
                  </div>
                </div>
                <ProgressBar value={subject.accuracy ?? 0} />
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionHead title="Weak areas" action={<span className="panel-note">Below 60% after 3+ attempts</span>} />
          {data.weakAreas.length === 0 ? (
            <div className="subtle-empty">
              <Target size={26} />
              <h3>Not enough evidence yet</h3>
              <p>Answer at least three questions in a topic and we will start flagging patterns below 60%.</p>
              <Link to="/app/practice" className="btn btn-secondary btn-sm">Start practice</Link>
            </div>
          ) : (
            <div className="weak-list">
              {data.weakAreas.map((topic) => (
                <Link to={`/app/practice?topic=${topic.slug}`} className="weak-row" key={topic.slug}>
                  <div>
                    <strong>{topic.name}</strong>
                    <small>{subjectLabel[topic.subject]} · {topic.attempts} attempts</small>
                  </div>
                  <span className="weak-score">{formatPercent(topic.accuracy)}</span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-columns">
        <section className="panel">
          <SectionHead title="Recent activity" action={<Link to="/app/progress" className="text-link">See all <ArrowRight size={14} /></Link>} />
          {data.recentAttempts.length === 0 ? (
            <div className="subtle-empty">
              <BookOpen size={26} />
              <h3>No answers yet</h3>
              <p>Your recent practice and checkpoint results will appear here.</p>
            </div>
          ) : (
            <div className="activity-list">
              {data.recentAttempts.map((attempt) => (
                <div className="activity-row" key={`${attempt.questionId}-${attempt.answeredAt}`}>
                  <span className={`result-dot ${attempt.isCorrect ? 'correct' : 'incorrect'}`} />
                  <div>
                    <strong>{attempt.topic.name}</strong>
                    <small>{attempt.isCorrect ? 'Correct' : 'Incorrect'} · {formatDateTime(attempt.answeredAt)}</small>
                  </div>
                  <Link to={`/app/learn/${attempt.topic.slug}`} className="icon-link" aria-label={`Open ${attempt.topic.name}`}>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <SectionHead title="Mock tests" action={<Link to="/app/mocks" className="text-link">All mocks <ArrowRight size={14} /></Link>} />
          {data.mockHistory.length === 0 ? (
            <div className="subtle-empty">
              <Clock3 size={26} />
              <h3>Take a baseline</h3>
              <p>A short timed mock gives the dashboard something useful to work with.</p>
              <Link to="/app/mocks" className="btn btn-secondary btn-sm">Browse mocks</Link>
            </div>
          ) : (
            <div className="mock-history-list">
              {data.mockHistory.slice(0, 3).map((mock) => (
                <Link to={`/app/mocks/attempts/${mock.id}`} key={mock.id} className="mock-history-row">
                  <div>
                    <strong>{mock.title}</strong>
                    <small>{mock.submittedAt ? formatDateTime(mock.submittedAt) : 'Submitted'}</small>
                  </div>
                  <span className="mock-score">{formatPercent(mock.percentage)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="quick-row">
        <Link to="/app/learn" className="quick-card"><BookOpen size={20} /><span><strong>Browse lessons</strong><small>25 topics with checkpoints</small></span><ArrowRight size={16} /></Link>
        <Link to="/app/companies" className="quick-card"><Layers3 size={20} /><span><strong>Company profiles</strong><small>Explore 25 IT employers</small></span><ArrowRight size={16} /></Link>
        <Link to="/app/bookmarks" className="quick-card"><Bookmark size={20} /><span><strong>Saved questions</strong><small>{data.stats.bookmarks} bookmarked</small></span><ArrowRight size={16} /></Link>
        <Link to="/app/readiness" className="quick-card"><TrendingUp size={20} /><span><strong>Readiness checklist</strong><small>10 practical career items</small></span><ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
