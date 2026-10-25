import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Flame,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { Subject } from '@titanapt/shared';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { ErrorState, Loader, PageHeader, ProgressBar, SectionHead, StatCard } from '../components/ui';
import { formatDateTime, formatPercent, subjectLabel } from '../lib/format';

type Dashboard = {
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
  streak: { current: number; longest: number; rule: string };
  activity: Array<{ date: string; count: number }>;
  subjects: Array<{ subject: Subject; topics: number; lessons: number; completedTopics: number; attempts: number; accuracy: number | null }>;
  weakAreas: Array<{ slug: string; name: string; subject: Subject; attempts: number; accuracy: number | null }>;
  recentAttempts: Array<{ questionId: string; isCorrect: boolean; answeredAt: string; topic: { name: string; slug: string } }>;
  mockHistory: Array<{ id: string; title: string; slug: string; score: number | null; maxScore: number | null; percentage: number | null; submittedAt: string | null }>;
};

type LessonProgress = {
  status: 'IN_PROGRESS' | 'COMPLETED';
  bestScore: number;
  attemptsCount: number;
  updatedAt: string;
  lesson: { id: string; title: string; level: string };
  topic: { slug: string; name: string; subject: Subject };
};

export function ProgressPage() {
  useDocumentTitle('Progress');
  const dashboard = useApi<Dashboard>('/api/dashboard');
  const lessons = useApi<LessonProgress[]>('/api/progress');

  if (dashboard.loading || lessons.loading) return <Loader label="Building your progress report" />;
  if (dashboard.error || !dashboard.data) return <ErrorState message={dashboard.error ?? 'Progress unavailable.'} onRetry={dashboard.reload} />;
  if (lessons.error || !lessons.data) return <ErrorState message={lessons.error ?? 'Lesson history unavailable.'} onRetry={lessons.reload} />;

  const data = dashboard.data;
  const rows = lessons.data;
  const completedRows = rows.filter((row) => row.status === 'COMPLETED');
  const maxActivity = Math.max(1, ...data.activity.map((day) => day.count));
  const subjectCoverage = data.subjects.map((subject) => ({
    ...subject,
    coverage: subject.topics > 0 ? Math.round((subject.completedTopics / subject.topics) * 100) : 0,
  }));
  const strongest = [...subjectCoverage].filter((subject) => subject.attempts >= 3).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0];
  const weakest = data.weakAreas[0];

  return (
    <div>
      <PageHeader
        eyebrow="Progress report"
        title="Evidence of the work you have done."
        subtitle="Accuracy, lesson completion, timed-mock history and the topics that need the next block of attention."
        actions={<Link to="/app/practice" className="btn btn-primary">Practise next <ArrowRight size={16} /></Link>}
      />

      <div className="stat-grid">
        <StatCard label="Questions answered" value={data.stats.totalAttempts} note={`${data.stats.weeklySolved} in the last 7 days`} />
        <StatCard label="Overall accuracy" value={formatPercent(data.stats.accuracy)} note={`${data.stats.correctAttempts} correct`} />
        <StatCard label="Lessons completed" value={`${data.stats.lessonsCompleted}/${data.stats.lessonsTotal}`} note={`${completedRows.length} progress records`} />
        <StatCard label="Current streak" value={`${data.streak.current} days`} note={`Longest: ${data.streak.longest} days`} />
      </div>

      <div className="progress-layout">
        <section className="panel activity-panel">
          <SectionHead title="Last 14 days" action={<span className="panel-note">{data.stats.weeklySolved} answered this week</span>} />
          <div className="activity-chart" role="img" aria-label="Questions answered over the last fourteen days">
            {data.activity.map((day) => (
              <div className="activity-day" key={day.date}>
                <div className="activity-bar-wrap">
                  <div
                    className="activity-bar"
                    style={{ height: `${Math.max(day.count ? 12 : 3, (day.count / maxActivity) * 100)}%` }}
                    title={`${day.count} answer${day.count === 1 ? '' : 's'} on ${day.date}`}
                  />
                </div>
                <span>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
                <small>{day.count || ''}</small>
              </div>
            ))}
          </div>
          <div className="streak-strip">
            <Flame size={20} />
            <div>
              <strong>{data.streak.current}-day current streak · {data.streak.longest}-day best</strong>
              <small>{data.streak.rule}</small>
            </div>
          </div>
        </section>

        <aside className="progress-highlights">
          <div className="panel">
            <h3>What the data suggests</h3>
            {strongest ? (
              <div className="insight-row">
                <TrendingUp size={18} />
                <div><strong>{subjectLabel[strongest.subject]}</strong><span>Strongest measured subject at {formatPercent(strongest.accuracy)} accuracy.</span></div>
              </div>
            ) : (
              <div className="insight-row">
                <BarChart3 size={18} />
                <div><strong>Not enough data yet</strong><span>Answer at least three questions in a subject to make a comparison.</span></div>
              </div>
            )}
            {weakest ? (
              <div className="insight-row insight-warn">
                <Target size={18} />
                <div><strong>{weakest.name}</strong><span>{formatPercent(weakest.accuracy)} from {weakest.attempts} attempts. Schedule a focused set.</span></div>
              </div>
            ) : (
              <div className="insight-row">
                <Target size={18} />
                <div><strong>No weak topic flagged</strong><span>Weak topics appear after at least three attempts below 60% accuracy.</span></div>
              </div>
            )}
            <Link to="/app/practice" className="btn btn-secondary btn-block">Build the next set</Link>
          </div>
          <div className="panel progress-mini">
            <div><BookOpenCheck size={18} /><span>Topics touched</span><strong>{data.stats.topicsCompleted}/{data.stats.topicsTotal}</strong></div>
            <div><CalendarDays size={18} /><span>Mocks submitted</span><strong>{data.stats.mockAttempts}</strong></div>
            <div><Bookmark size={18} /><span>Bookmarked questions</span><strong>{data.stats.bookmarks}</strong></div>
          </div>
        </aside>
      </div>

      <section className="panel progress-subjects">
        <SectionHead title="Subject performance" action={<span className="panel-note">Accuracy is based on answered questions only</span>} />
        <div className="progress-subject-table">
          <div className="table-head">
            <span>Subject</span><span>Topics covered</span><span>Attempts</span><span>Accuracy</span>
          </div>
          {subjectCoverage.map((subject) => (
            <div className="table-row" key={subject.subject}>
              <div>
                <span className={`subject-tag subject-${subject.subject.toLowerCase()}`}>{subjectLabel[subject.subject]}</span>
                <small>{subject.lessons} approved lessons</small>
              </div>
              <div className="table-progress">
                <ProgressBar value={subject.completedTopics} max={subject.topics} />
                <small>{subject.completedTopics}/{subject.topics} topics</small>
              </div>
              <span>{subject.attempts}</span>
              <strong>{formatPercent(subject.accuracy)}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="progress-bottom-grid">
        <section className="panel">
          <SectionHead title="Lesson progress" action={<Link to="/app/learn" className="text-link">Curriculum <ArrowRight size={14} /></Link>} />
          {rows.length === 0 ? (
            <div className="empty-inline">
              <p>No lesson activity yet. Start with a short lesson, then complete its checkpoint.</p>
              <Link to="/app/learn" className="btn btn-secondary btn-sm">Browse lessons</Link>
            </div>
          ) : (
            <div className="lesson-progress-list">
              {rows.slice(0, 8).map((row) => (
                <Link to={`/app/learn/${row.topic.slug}/lessons/${row.lesson.id}`} className="lesson-progress-row" key={`${row.lesson.id}`}>
                  <span className={`status-dot ${row.status === 'COMPLETED' ? 'done' : 'active'}`} />
                  <div>
                    <strong>{row.lesson.title}</strong>
                    <small>{row.topic.name} · best {row.bestScore} · {row.attemptsCount} attempt{row.attemptsCount === 1 ? '' : 's'}</small>
                  </div>
                  <span className={`badge badge-${row.status === 'COMPLETED' ? 'success' : 'warning'}`}>{row.status === 'COMPLETED' ? 'Completed' : 'In progress'}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <SectionHead title="Mock history" action={<Link to="/app/mocks" className="text-link">Mocks <ArrowRight size={14} /></Link>} />
          {data.mockHistory.length === 0 ? (
            <div className="empty-inline">
              <p>No submitted mock tests yet. A timed attempt will expose speed and selection issues that untimed practice hides.</p>
              <Link to="/app/mocks" className="btn btn-secondary btn-sm">View mock tests</Link>
            </div>
          ) : (
            <div className="mock-history-list">
              {data.mockHistory.map((attempt) => (
                <Link to={`/app/mocks/attempts/${attempt.id}`} className="mock-history-row" key={attempt.id}>
                  <div>
                    <strong>{attempt.title}</strong>
                    <small>{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'Submitted'}</small>
                  </div>
                  <div className="mock-history-score">
                    <strong>{formatPercent(attempt.percentage)}</strong>
                    <small>{attempt.score ?? 0}/{attempt.maxScore ?? '—'}</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="panel recent-practice-panel">
        <SectionHead title="Recent answers" />
        {data.recentAttempts.length === 0 ? (
          <div className="empty-inline"><p>Your recent answer activity will appear here.</p></div>
        ) : (
          <div className="recent-answer-row-list">
            {data.recentAttempts.map((attempt) => (
              <div className="recent-answer-row" key={`${attempt.questionId}-${attempt.answeredAt}`}>
                {attempt.isCorrect ? <CheckCircle2 size={17} /> : <span className="status-dot wrong" />}
                <span>{attempt.topic.name}</span>
                <small>{formatDateTime(attempt.answeredAt)}</small>
                <span className={`badge badge-${attempt.isCorrect ? 'success' : 'danger'}`}>{attempt.isCorrect ? 'Correct' : 'Incorrect'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
