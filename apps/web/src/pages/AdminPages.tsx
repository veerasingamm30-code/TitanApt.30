import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, NavLink, Outlet, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  FileClock,
  FileSearch,
  Flag,
  History,
  Layers3,
  ListChecks,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  Users,
  XCircle,
} from 'lucide-react';
import type { Difficulty, OptionView, ReviewStatus, Subject } from '@titanapt/shared';
import { apiData, messageFromError } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { Badge, ErrorState, Loader, PageHeader, SectionHead, StatCard } from '../components/ui';
import { formatDateTime, subjectLabel } from '../lib/format';

const adminTabs = [
  { to: '/app/admin', label: 'Overview', icon: ShieldCheck, end: true },
  { to: '/app/admin/questions', label: 'Questions', icon: ListChecks },
  { to: '/app/admin/flags', label: 'Flags', icon: Flag },
  { to: '/app/admin/imports', label: 'Imports', icon: UploadCloud },
  { to: '/app/admin/mocks', label: 'Mocks', icon: FileClock },
  { to: '/app/admin/audit', label: 'Audit log', icon: History },
];

export function AdminLayout() {
  useDocumentTitle('Admin');
  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">Review desk</span>
          <h1>Admin workspace</h1>
          <p>Question review, learner-reported flags, source registry, mock publication and an immutable audit trail.</p>
        </div>
        <div className="admin-secure"><Lock size={15} /> Reviewer access only</div>
      </div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {adminTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `admin-tab ${isActive ? 'active' : ''}`}
          >
            <tab.icon size={16} /> {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

type AdminOverview = {
  counts: { users: number; pendingQuestions: number; approvedQuestions: number; openFlags: number };
  imports: Array<{ id: string; status: string; source: string; candidateCount: number; approvedCount: number; skippedCount: number; startedAt: string }>;
  audit: Array<{ id: string; action: string; target: string; summary: string | null; actor: string; createdAt: string }>;
};

export function AdminOverviewPage() {
  useDocumentTitle('Admin overview');
  const { data, loading, error, reload } = useApi<AdminOverview>('/api/admin/overview');
  if (loading) return <Loader label="Loading admin overview" />;
  if (error || !data) return <ErrorState message={error ?? 'Admin overview unavailable.'} onRetry={reload} />;

  return (
    <div>
      <div className="stat-grid">
        <StatCard label="Registered users" value={data.counts.users} note="all roles" />
        <StatCard label="Pending review" value={data.counts.pendingQuestions} note="questions awaiting a decision" />
        <StatCard label="Approved questions" value={data.counts.approvedQuestions} note="available for practice" />
        <StatCard label="Open flags" value={data.counts.openFlags} note="learner-reported issues" />
      </div>

      <div className="admin-overview-grid">
        <section className="panel">
          <SectionHead title="Review priorities" />
          <div className="admin-priority-list">
            <Link to="/app/admin/questions?status=PENDING" className="admin-priority-row">
              <span className="priority-icon priority-amber"><ListChecks size={19} /></span>
              <div><strong>Review pending questions</strong><small>{data.counts.pendingQuestions} questions need a verified correct option and explanation.</small></div>
              <ArrowRight size={16} />
            </Link>
            <Link to="/app/admin/flags?status=OPEN" className="admin-priority-row">
              <span className="priority-icon priority-red"><Flag size={19} /></span>
              <div><strong>Resolve learner flags</strong><small>{data.counts.openFlags} open reports about question quality or correctness.</small></div>
              <ArrowRight size={16} />
            </Link>
            <Link to="/app/admin/imports" className="admin-priority-row">
              <span className="priority-icon priority-blue"><Database size={19} /></span>
              <div><strong>Check source health</strong><small>Inspect registered PDFs and the latest extraction jobs.</small></div>
              <ArrowRight size={16} />
            </Link>
            <Link to="/app/admin/mocks" className="admin-priority-row">
              <span className="priority-icon priority-teal"><FileClock size={19} /></span>
              <div><strong>Manage mock publication</strong><small>Review the composition before exposing a timed paper to learners.</small></div>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="panel">
          <SectionHead title="Recent imports" action={<Link to="/app/admin/imports" className="text-link">All imports <ArrowRight size={14} /></Link>} />
          {data.imports.length === 0 ? (
            <p className="muted">No import jobs recorded.</p>
          ) : (
            <div className="admin-mini-list">
              {data.imports.map((job) => (
                <div className="admin-mini-row" key={job.id}>
                  <div><strong>{job.source}</strong><small>{formatDateTime(job.startedAt)}</small></div>
                  <div><Badge tone={job.status === 'COMPLETED' ? 'success' : job.status === 'FAILED' ? 'danger' : 'warning'}>{job.status.toLowerCase()}</Badge><small>{job.approvedCount}/{job.candidateCount} approved</small></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <SectionHead title="Latest admin activity" action={<Link to="/app/admin/audit" className="text-link">Full log <ArrowRight size={14} /></Link>} />
          <div className="timeline-list">
            {data.audit.map((entry) => (
              <div className="timeline-row" key={entry.id}>
                <span className="timeline-dot" />
                <div><strong>{entry.action.replaceAll('_', ' ').toLowerCase()}</strong><p>{entry.summary ?? entry.target}</p><small>{entry.actor} · {formatDateTime(entry.createdAt)}</small></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

type AdminQuestion = {
  id: string;
  stem: string;
  statement: string | null;
  difficulty: Difficulty;
  topic: { slug: string; name: string; subject: Subject };
  options: OptionView[];
  sourceDocument: string;
  sourcePage: number;
  reviewStatus: ReviewStatus;
  sourceKey: string;
  sourceCheck: string;
  explanation: string;
  correctOptionId: string | null;
};

type AdminQuestionList = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  questions: AdminQuestion[];
};

const reviewStatuses: ReviewStatus[] = ['PENDING', 'NEEDS_FIX', 'QUARANTINED', 'APPROVED', 'REJECTED', 'RETIRED'];

function statusTone(status: ReviewStatus) {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'NEEDS_FIX' || status === 'QUARANTINED') return 'danger';
  return 'neutral';
}

export function AdminQuestionsPage() {
  useDocumentTitle('Question review');
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? 1);
  const [draftSearch, setDraftSearch] = useState(search);
  const [correctDrafts, setCorrectDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('pageSize', '10');
  const { data, loading, error, reload } = useApi<AdminQuestionList>(`/api/admin/questions?${params.toString()}`);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateFilter('search', draftSearch.trim());
  }

  function goPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  async function review(question: AdminQuestion, reviewStatus: ReviewStatus) {
    const correctOptionId = correctDrafts[question.id] ?? question.correctOptionId ?? null;
    if (reviewStatus === 'APPROVED' && !correctOptionId) {
      setActionError('Choose the verified correct option before approving this question.');
      return;
    }
    if (reviewStatus === 'APPROVED' && !question.explanation.trim()) {
      setActionError('This question has no explanation. Send it for repair before approving.');
      return;
    }
    setBusyId(question.id);
    setActionError(null);
    try {
      await apiData(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        body: { reviewStatus, correctOptionId },
      });
      reload();
    } catch (err) {
      setActionError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Content quality"
        title="Question review desk."
        subtitle="Only approved questions with a verified answer and explanation can enter practice or mock tests."
      />

      <div className="admin-toolbar panel">
        <form className="admin-search" onSubmit={submitSearch}>
          <label className="search-field">
            <Search size={17} />
            <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search stem or source key" aria-label="Search questions" />
          </label>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>
        <label className="inline-select">
          <span>Status</span>
          <select value={status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">All statuses</option>
            {reviewStatuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reload}><RefreshCw size={15} /> Refresh</button>
      </div>

      {actionError && <div className="form-error" role="alert">{actionError}</div>}

      {loading ? <Loader label="Loading review queue" /> : error || !data ? (
        <ErrorState message={error ?? 'Question queue unavailable.'} onRetry={reload} />
      ) : (
        <>
          <div className="admin-list-meta">
            <span>{data.total} question{data.total === 1 ? '' : 's'}</span>
            <span>Page {data.page} of {data.totalPages}</span>
          </div>
          {data.questions.length === 0 ? (
            <div className="empty-state"><FileSearch size={30} /><h3>No questions match those filters</h3><p>Try a different status or clear the search.</p></div>
          ) : (
            <div className="review-queue">
              {data.questions.map((question) => {
                const chosen = correctDrafts[question.id] ?? question.correctOptionId ?? '';
                return (
                  <article className="admin-question-card panel" key={question.id}>
                    <div className="admin-question-head">
                      <div>
                        <span className={`subject-tag subject-${question.topic.subject.toLowerCase()}`}>{subjectLabel[question.topic.subject]}</span>
                        <span className="bookmark-topic">{question.topic.name}</span>
                        <span className={`difficulty difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
                      </div>
                      <Badge tone={statusTone(question.reviewStatus) as 'success' | 'warning' | 'danger' | 'neutral'}>{question.reviewStatus.replaceAll('_', ' ')}</Badge>
                    </div>
                    <h2>{question.stem}</h2>
                    {question.statement && <p className="question-statement">{question.statement}</p>}
                    <div className="admin-option-list">
                      {question.options.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={`admin-option ${chosen === option.id ? 'correct' : ''}`}
                          onClick={() => setCorrectDrafts((current) => ({ ...current, [question.id]: option.id }))}
                        >
                          <span>{option.label}</span>
                          <span>{option.text}</span>
                          {chosen === option.id && <CheckCircle2 size={17} />}
                        </button>
                      ))}
                    </div>
                    <details className="admin-explanation">
                      <summary>Review explanation and provenance</summary>
                      <div>
                        {question.explanation ? <p>{question.explanation}</p> : <p className="text-danger">No explanation is saved. This question cannot be approved yet.</p>}
                        <small>{question.sourceKey} · {question.sourceDocument}, p. {question.sourcePage} · check: {question.sourceCheck}</small>
                      </div>
                    </details>
                    <div className="admin-question-actions">
                      <span className="panel-note">Choose the verified option, then record a decision.</span>
                      <div>
                        {question.reviewStatus !== 'APPROVED' && (
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => void review(question, 'APPROVED')} disabled={busyId === question.id}>
                            {busyId === question.id ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} Approve
                          </button>
                        )}
                        {question.reviewStatus !== 'NEEDS_FIX' && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void review(question, 'NEEDS_FIX')} disabled={busyId === question.id}>
                            Needs fix
                          </button>
                        )}
                        {question.reviewStatus !== 'REJECTED' && (
                          <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => void review(question, 'REJECTED')} disabled={busyId === question.id}>
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {data.totalPages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => goPage(page - 1)} disabled={page <= 1}><ChevronLeft size={15} /> Previous</button>
              <span>Page {page} of {data.totalPages}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => goPage(page + 1)} disabled={page >= data.totalPages}>Next <ChevronRight size={15} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type AdminFlag = {
  id: string;
  note: string;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  createdAt: string;
  user: string;
  question: { id: string; stem: string; sourceKey: string; reviewStatus: ReviewStatus };
};

type AdminFlagList = { total: number; page: number; totalPages: number; flags: AdminFlag[] };

export function AdminFlagsPage() {
  useDocumentTitle('Question flags');
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'OPEN';
  const query = status ? `?status=${status}` : '';
  const { data, loading, error, reload } = useApi<AdminFlagList>(`/api/admin/flags${query}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function resolve(flag: AdminFlag, nextStatus: 'REVIEWED' | 'DISMISSED') {
    setBusyId(flag.id);
    setActionError(null);
    try {
      await apiData(`/api/admin/flags/${flag.id}`, { method: 'PATCH', body: { status: nextStatus } });
      reload();
    } catch (err) {
      setActionError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  function changeStatus(nextStatus: string) {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set('status', nextStatus);
    else next.delete('status');
    setSearchParams(next);
  }

  return (
    <div>
      <PageHeader eyebrow="Learner reports" title="Question flags." subtitle="Review learner-reported issues without deleting the underlying history." />
      <div className="admin-toolbar panel">
        <div className="filter-tabs">
          {['OPEN', 'REVIEWED', 'DISMISSED', ''].map((value) => (
            <button type="button" key={value || 'all'} className={status === value ? 'active' : ''} onClick={() => changeStatus(value)}>
              {value ? value.charAt(0) + value.slice(1).toLowerCase() : 'All'}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reload}><RefreshCw size={15} /> Refresh</button>
      </div>
      {actionError && <div className="form-error" role="alert">{actionError}</div>}
      {loading ? <Loader label="Loading flags" /> : error || !data ? <ErrorState message={error ?? 'Flags unavailable.'} onRetry={reload} /> : (
        data.flags.length === 0 ? (
          <div className="empty-state"><Flag size={30} /><h3>No flags in this view</h3><p>Learner reports will appear here with their question and note.</p></div>
        ) : (
          <div className="flag-list">
            {data.flags.map((flag) => (
              <article className="flag-card panel" key={flag.id}>
                <div className="flag-card-head">
                  <div>
                    <Badge tone={flag.status === 'OPEN' ? 'warning' : 'neutral'}>{flag.status}</Badge>
                    <span className="flag-date">{formatDateTime(flag.createdAt)}</span>
                    <span className="flag-user">{flag.user}</span>
                  </div>
                  <span className="panel-note">{flag.question.reviewStatus.replaceAll('_', ' ')}</span>
                </div>
                <h3>{flag.question.stem}</h3>
                <blockquote>{flag.note}</blockquote>
                <div className="flag-card-foot">
                  <span className="source-line">{flag.question.sourceKey}</span>
                  {flag.status === 'OPEN' ? (
                    <div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void resolve(flag, 'REVIEWED')} disabled={busyId === flag.id}>Mark reviewed</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void resolve(flag, 'DISMISSED')} disabled={busyId === flag.id}>Dismiss</button>
                    </div>
                  ) : (
                    <span className="badge badge-neutral">Resolved</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </div>
  );
}

type ImportSource = {
  id: string;
  filename: string;
  relativePath: string;
  pageCount: number;
  extractionStatus: string;
  importStatus: string;
  licensingNote: string;
  lastImportedAt: string | null;
};

type ImportJob = {
  id: string;
  source: string;
  status: string;
  warnings: unknown;
  processedPages: number;
  candidateCount: number;
  approvedCount: number;
  skippedCount: number;
  startedAt: string;
  finishedAt: string | null;
};

type ImportsData = { sources: ImportSource[]; jobs: ImportJob[] };

export function AdminImportsPage() {
  useDocumentTitle('Import registry');
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<ImportsData>('/api/admin/imports');
  const [chapter, setChapter] = useState('1');
  const [limit, setLimit] = useState('20');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const canRun = user?.role === 'ADMIN';

  async function runImport(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setRunError(null);
    setRunMessage(null);
    try {
      const result = await apiData<{
        chapterTitle: string;
        candidateCount: number;
        importedCount: number;
        skippedCount: number;
      }>('/api/admin/imports/run', {
        method: 'POST',
        body: { chapter: Number(chapter), limit: Number(limit) },
      });
      setRunMessage(
        `${result.chapterTitle}: ${result.importedCount} new pending question(s), ${result.skippedCount} skipped, ${result.candidateCount} candidates recorded.`,
      );
      reload();
    } catch (err) {
      setRunError(messageFromError(err));
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <Loader label="Loading import registry" />;
  if (error || !data) return <ErrorState message={error ?? 'Import registry unavailable.'} onRetry={reload} />;

  return (
    <div>
      <PageHeader eyebrow="Source registry" title="Import and provenance control." subtitle="Track which source files are registered, what the extractor processed, and how many candidates survived review." />
      <div className="import-notice panel">
        <AlertTriangle size={20} />
        <div>
          <strong>Bounded extraction runner</strong>
          <p>Extract a limited, chapter-sized batch from the supplied question PDF. Every imported question is created as PENDING, linked to its source page and candidate record, and must be reviewed before it can enter practice or mocks.</p>
        </div>
      </div>

      <div className="import-summary">
        <StatCard label="Registered sources" value={data.sources.length} note="checksum tracked" />
        <StatCard label="Text-layer ready" value={data.sources.filter((source) => source.extractionStatus !== 'NEEDS_OCR').length} note="text available" />
        <StatCard label="Recent jobs" value={data.jobs.length} note="latest first" />
        <StatCard label="Candidate questions" value={data.jobs.reduce((sum, job) => sum + job.candidateCount, 0)} note="across recorded jobs" />
      </div>

      <section className="panel import-runner">
        <SectionHead title="Run a bounded import" />
        {canRun ? (
          <form className="import-runner-form" onSubmit={(event) => void runImport(event)}>
            <div className="form-row">
              <label className="field">
                <span>Chapter</span>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={chapter}
                  onChange={(event) => setChapter(event.target.value)}
                  required
                />
                <small className="field-help">Chapters 1–25 map to the seeded topics.</small>
              </label>
              <label className="field">
                <span>Question limit</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                  required
                />
                <small className="field-help">Maximum 100 per run. New questions remain pending.</small>
              </label>
            </div>
            {runError && <div className="field-error" role="alert">{runError}</div>}
            {runMessage && <p className="import-runner-success" role="status">{runMessage}</p>}
            <div className="import-runner-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={running}>
                {running ? <Loader2 size={15} className="spin" /> : <UploadCloud size={15} />}
                {running ? 'Extracting…' : 'Run bounded import'}
              </button>
            </div>
          </form>
        ) : (
          <p className="muted">Only an administrator can launch imports. Reviewers can inspect sources and job history.</p>
        )}
      </section>

      <section className="panel import-sources">
        <SectionHead title="Registered source files" action={<button type="button" className="btn btn-ghost btn-sm" onClick={reload}><RefreshCw size={15} /> Refresh</button>} />
        <div className="source-table">
          <div className="table-head"><span>File</span><span>Pages</span><span>Extraction</span><span>Import state</span><span>Last imported</span></div>
          {data.sources.map((source) => (
            <div className="table-row" key={source.id}>
              <div><strong>{source.filename}</strong><small>{source.relativePath}</small></div>
              <span>{source.pageCount.toLocaleString('en-IN')}</span>
              <Badge tone={source.extractionStatus === 'EXTRACTED' ? 'success' : 'warning'}>{source.extractionStatus.toLowerCase()}</Badge>
              <Badge tone="info">{source.importStatus}</Badge>
              <span>{source.lastImportedAt ? formatDateTime(source.lastImportedAt) : '—'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHead title="Import job history" />
        {data.jobs.length === 0 ? <p className="muted">No import jobs have run.</p> : (
          <div className="source-table job-table">
            <div className="table-head"><span>Source</span><span>Started</span><span>Status</span><span>Candidates</span><span>Approved / skipped</span></div>
            {data.jobs.map((job) => (
              <div className="table-row" key={job.id}>
                <strong>{job.source}</strong>
                <span>{formatDateTime(job.startedAt)}</span>
                <Badge tone={job.status === 'COMPLETED' ? 'success' : job.status === 'FAILED' ? 'danger' : 'warning'}>{job.status.toLowerCase()}</Badge>
                <span>{job.candidateCount}</span>
                <span>{job.approvedCount} / {job.skippedCount}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type AdminMock = {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  sections: Array<{ name?: string; count?: number }>;
  marking: { correct?: number; incorrect?: number; unanswered?: number };
  status: string;
  sourceNote: string | null;
  _count: { attempts: number };
  createdAt: string;
};

export function AdminMocksPage() {
  useDocumentTitle('Mock publication');
  const { data, loading, error, reload } = useApi<AdminMock[]>('/api/admin/mocks');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function changeStatus(mock: AdminMock) {
    const nextStatus = mock.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    if (nextStatus === 'DRAFT' && !window.confirm(`Unpublish “${mock.title}”? Learners will no longer be able to start a new attempt.`)) return;
    setBusyId(mock.id);
    setActionError(null);
    try {
      await apiData(`/api/admin/mocks/${mock.id}`, { method: 'PATCH', body: { status: nextStatus } });
      reload();
    } catch (err) {
      setActionError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loader label="Loading mock tests" />;
  if (error || !data) return <ErrorState message={error ?? 'Mock administration unavailable.'} onRetry={reload} />;

  return (
    <div>
      <PageHeader eyebrow="Assessment control" title="Mock publication." subtitle="Review composition and control which timed papers learners can start." />
      {actionError && <div className="form-error" role="alert">{actionError}</div>}
      <div className="admin-mock-list">
        {data.map((mock) => {
          const total = Array.isArray(mock.sections) ? mock.sections.reduce((sum, section) => sum + (section.count ?? 0), 0) : 0;
          return (
            <article className="admin-mock-card panel" key={mock.id}>
              <div className="admin-mock-head">
                <div>
                  <span className="eyebrow">/{mock.slug}</span>
                  <h2>{mock.title}</h2>
                </div>
                <Badge tone={mock.status === 'PUBLISHED' ? 'success' : mock.status === 'ARCHIVED' ? 'neutral' : 'warning'}>{mock.status.toLowerCase()}</Badge>
              </div>
              <p>{mock.description}</p>
              <div className="mock-facts">
                <span><FileClock size={15} /> {mock.durationMinutes} min</span>
                <span><Layers3 size={15} /> {total} questions</span>
                <span><Users size={15} /> {mock._count.attempts} attempts</span>
              </div>
              <div className="section-chip-row">
                {Array.isArray(mock.sections) && mock.sections.map((section, index) => (
                  <span className="plain-tag" key={`${section.name}-${index}`}>{section.name} · {section.count}</span>
                ))}
              </div>
              <div className="mock-marking">
                <span>+{mock.marking.correct ?? 0} correct</span>
                <span>{mock.marking.incorrect ?? 0} incorrect</span>
                <span>{mock.marking.unanswered ?? 0} unanswered</span>
              </div>
              {mock.sourceNote && <p className="source-line">{mock.sourceNote}</p>}
              <div className="admin-mock-actions">
                <Link to={`/app/mocks/${mock.slug}`} className="btn btn-ghost btn-sm" target="_blank">Preview briefing <ArrowRight size={14} /></Link>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void changeStatus(mock)} disabled={busyId === mock.id}>
                  {busyId === mock.id ? <Loader2 size={15} className="spin" /> : mock.status === 'PUBLISHED' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                  {mock.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="import-notice panel">
        <CircleAlert size={20} />
        <div><strong>Mock composition is controlled by the seed/build</strong><p>This build supports publication control, not ad-hoc mock creation. Each paper draws only from approved questions and records every attempt.</p></div>
      </div>
    </div>
  );
}

type AuditEntry = {
  id: string;
  action: string;
  target: string;
  summary: string | null;
  actor: string;
  createdAt: string;
};

export function AdminAuditPage() {
  useDocumentTitle('Audit log');
  const { data, loading, error, reload } = useApi<AuditEntry[]>('/api/admin/audit');
  if (loading) return <Loader label="Loading audit log" />;
  if (error || !data) return <ErrorState message={error ?? 'Audit log unavailable.'} onRetry={reload} />;

  return (
    <div>
      <PageHeader eyebrow="Accountability" title="Audit log." subtitle="A chronological record of question review, flag resolution and mock publication decisions." />
      {data.length === 0 ? <div className="empty-state"><History size={30} /><h3>No audit entries yet</h3><p>Review actions will appear here.</p></div> : (
        <section className="panel audit-table">
          <div className="table-head"><span>Action</span><span>Target</span><span>Summary</span><span>Actor</span><span>Time</span></div>
          {data.map((entry) => (
            <div className="table-row" key={entry.id}>
              <Badge tone="info">{entry.action.replaceAll('_', ' ').toLowerCase()}</Badge>
              <span className="mono-cell">{entry.target}</span>
              <span>{entry.summary ?? '—'}</span>
              <span>{entry.actor}</span>
              <span>{formatDateTime(entry.createdAt)}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
