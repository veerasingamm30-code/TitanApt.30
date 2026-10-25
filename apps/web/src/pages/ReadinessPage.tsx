import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  Github,
  GraduationCap,
  Info,
  Linkedin,
  Loader2,
  Target,
  Timer,
} from 'lucide-react';
import { apiData, messageFromError } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { ErrorState, Loader, PageHeader, ProgressBar, SectionHead } from '../components/ui';
import { formatDate } from '../lib/format';

type ReadinessCategory = 'DOCUMENT' | 'PROFILE' | 'TECHNICAL' | 'PRACTICE' | 'INTERVIEW';

type ReadinessItem = {
  key: string;
  title: string;
  category: ReadinessCategory;
  description: string;
  action: string;
  targetWeek: number;
  completed: boolean;
  completedAt: string | null;
};

type ReadinessData = {
  items: ReadinessItem[];
  completedCount: number;
  totalCount: number;
};

const categoryLabel: Record<ReadinessCategory, string> = {
  DOCUMENT: 'Documents',
  PROFILE: 'Professional profile',
  TECHNICAL: 'Technical base',
  PRACTICE: 'Practice',
  INTERVIEW: 'Interview',
};

const categoryIcon: Record<ReadinessCategory, typeof FileText> = {
  DOCUMENT: FileText,
  PROFILE: Github,
  TECHNICAL: GraduationCap,
  PRACTICE: Target,
  INTERVIEW: Linkedin,
};

const weekLabel: Record<number, string> = {
  1: 'Week 1 · Foundations',
  2: 'Week 2 · Visible proof',
  3: 'Week 3 · Technical depth',
  4: 'Week 4 · Interview readiness',
};

export function ReadinessPage() {
  useDocumentTitle('Placement readiness');
  const { data, loading, error, reload } = useApi<ReadinessData>('/api/readiness');
  const [items, setItems] = useState<ReadinessItem[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setItems(data.items);
  }, [data]);

  const completedCount = items.filter((item) => item.completed).length;
  const percent = items.length ? Math.round((completedCount / items.length) * 100) : 0;
  const nextItem = items.find((item) => !item.completed);
  const weeks = useMemo(() => {
    const grouped = new Map<number, ReadinessItem[]>();
    for (const item of items) {
      const group = grouped.get(item.targetWeek) ?? [];
      group.push(item);
      grouped.set(item.targetWeek, group);
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [items]);

  const categoryStats = useMemo(() => {
    const map = new Map<ReadinessCategory, { total: number; done: number }>();
    for (const item of items) {
      const entry = map.get(item.category) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (item.completed) entry.done += 1;
      map.set(item.category, entry);
    }
    return map;
  }, [items]);

  async function toggle(item: ReadinessItem) {
    if (pending.has(item.key)) return;
    const nextCompleted = !item.completed;
    setItems((current) => current.map((row) => row.key === item.key ? { ...row, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : null } : row));
    setPending((current) => new Set(current).add(item.key));
    setToggleError(null);
    try {
      await apiData(`/api/readiness/${item.key}`, { method: 'PATCH', body: { completed: nextCompleted } });
    } catch (err) {
      setItems((current) => current.map((row) => row.key === item.key ? item : row));
      setToggleError(messageFromError(err));
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(item.key);
        return next;
      });
    }
  }

  if (loading) return <Loader label="Opening your readiness checklist" />;
  if (error || !data) return <ErrorState message={error ?? 'Readiness checklist unavailable.'} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Placement readiness"
        title="Preparation you can actually verify."
        subtitle="A ten-item checklist across documents, proof of work, technical fundamentals, practice and interview stories."
        actions={<Link to="/app/progress" className="btn btn-secondary">View performance <ArrowRight size={16} /></Link>}
      />

      <section className="readiness-hero panel">
        <div className="readiness-score">
          <div className="readiness-ring" style={{ '--readiness': `${percent}%` } as React.CSSProperties}>
            <span><strong>{percent}%</strong><small>complete</small></span>
          </div>
          <div>
            <span className="eyebrow">Your readiness score</span>
            <h1>{completedCount} of {data.totalCount} essentials in place.</h1>
            <p>Readiness is not a guarantee of an offer. It is a record of the preparation you have actually finished.</p>
          </div>
        </div>
        <div className="readiness-next">
          <span className="eyebrow">Next useful action</span>
          {nextItem ? (
            <>
              <h3>{nextItem.title}</h3>
              <p>{nextItem.action}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void toggle(nextItem)} disabled={pending.has(nextItem.key)}>
                {pending.has(nextItem.key) ? <Loader2 className="spin" size={15} /> : <Check size={15} />} Mark as done
              </button>
            </>
          ) : (
            <>
              <h3>All ten items are complete.</h3>
              <p>Keep the evidence current. Revisit your resume, GitHub and interview stories before each application round.</p>
              <Link to="/app/mocks" className="btn btn-primary btn-sm">Sit a fresh mock <ArrowRight size={15} /></Link>
            </>
          )}
        </div>
      </section>

      {toggleError && <div className="form-error" role="alert">{toggleError}</div>}

      <div className="readiness-layout">
        <section className="readiness-timeline">
          {weeks.map(([week, weekItems]) => {
            const weekDone = weekItems.filter((item) => item.completed).length;
            return (
              <div className="readiness-week" key={week}>
                <div className="readiness-week-head">
                  <div>
                    <span className="week-kicker">{weekLabel[week] ?? `Week ${week}`}</span>
                    <span className="panel-note">{weekDone}/{weekItems.length} done</span>
                  </div>
                  <ProgressBar value={weekDone} max={weekItems.length} />
                </div>
                <div className="readiness-items">
                  {weekItems.map((item) => {
                    const Icon = categoryIcon[item.category];
                    const busy = pending.has(item.key);
                    return (
                      <article className={`readiness-item ${item.completed ? 'completed' : ''}`} key={item.key}>
                        <button
                          type="button"
                          className={`readiness-check ${item.completed ? 'checked' : ''}`}
                          onClick={() => void toggle(item)}
                          disabled={busy}
                          aria-pressed={item.completed}
                          aria-label={item.completed ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
                        >
                          {busy ? <Loader2 size={19} className="spin" /> : item.completed ? <CheckCircle2 size={21} /> : <Circle size={21} />}
                        </button>
                        <div className="readiness-item-body">
                          <div className="readiness-item-top">
                            <span className="category-pill"><Icon size={13} /> {categoryLabel[item.category]}</span>
                            {item.completedAt && <span className="completed-date">Done {formatDate(item.completedAt)}</span>}
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.description}</p>
                          <div className="readiness-action">
                            <Info size={15} />
                            <span>{item.action}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <aside className="readiness-aside">
          <div className="panel">
            <SectionHead title="By category" />
            <div className="category-list">
              {[...categoryStats.entries()].map(([category, stats]) => {
                const Icon = categoryIcon[category];
                return (
                  <div className="category-row" key={category}>
                    <span className="category-icon"><Icon size={17} /></span>
                    <div>
                      <strong>{categoryLabel[category]}</strong>
                      <small>{stats.done} of {stats.total} complete</small>
                    </div>
                    <span>{stats.total ? Math.round((stats.done / stats.total) * 100) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel readiness-honesty">
            <ClipboardCheck size={22} />
            <h3>Checklist integrity</h3>
            <p>This tool is private to your account. It records self-reported completion; it does not claim to certify skills or guarantee placement outcomes.</p>
            <div className="mini-fact"><Timer size={15} /><span>Review every item again before peak placement season.</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
