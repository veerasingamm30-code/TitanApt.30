import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookmarkMinus,
  BookOpen,
  Brain,
  ChevronDown,
  Search,
  Sparkles,
} from 'lucide-react';
import type { QuestionView, Subject } from '@titanapt/shared';
import { apiData, messageFromError } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { EmptyState, ErrorState, Loader, PageHeader } from '../components/ui';
import { formatDate, subjectLabel } from '../lib/format';

type BookmarkRow = {
  id: string;
  createdAt: string;
  question: QuestionView;
};

export function BookmarksPage() {
  useDocumentTitle('Bookmarks');
  const { data, loading, error, reload, setData } = useApi<BookmarkRow[]>('/api/bookmarks');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<Subject | 'ALL'>('ALL');
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const term = query.trim().toLowerCase();
    return data.filter((row) => {
      const matchesSubject = subject === 'ALL' || row.question.topic.subject === subject;
      const matchesQuery = !term || `${row.question.stem} ${row.question.statement ?? ''} ${row.question.topic.name}`.toLowerCase().includes(term);
      return matchesSubject && matchesQuery;
    });
  }, [data, query, subject]);

  const subjects = useMemo(() => new Set((data ?? []).map((row) => row.question.topic.subject)), [data]);

  async function remove(row: BookmarkRow) {
    setRemoving((current) => new Set(current).add(row.id));
    setRemoveError(null);
    try {
      await apiData(`/api/bookmarks/${row.question.id}`, { method: 'DELETE' });
      setData((current) => current?.filter((item) => item.id !== row.id) ?? null);
    } catch (err) {
      setRemoveError(messageFromError(err));
    } finally {
      setRemoving((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  }

  if (loading) return <Loader label="Loading your bookmarks" />;
  if (error || !data) return <ErrorState message={error ?? 'Bookmarks unavailable.'} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Saved for later"
        title="Questions worth a second look."
        subtitle="Bookmarks preserve the question and its topic. Open a focused practice set to answer it with full reasoning."
        actions={<Link to="/app/practice" className="btn btn-primary">Start practice <ArrowRight size={16} /></Link>}
      />

      {data.length > 0 && (
        <div className="bookmark-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input type="search" placeholder="Search bookmarked questions" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search bookmarks" />
          </label>
          <div className="filter-tabs">
            <button type="button" className={subject === 'ALL' ? 'active' : ''} onClick={() => setSubject('ALL')}>All</button>
            {[...subjects].map((item) => (
              <button type="button" key={item} className={subject === item ? 'active' : ''} onClick={() => setSubject(item)}>
                {subjectLabel[item].split(' ')[0]}
              </button>
            ))}
          </div>
          <span>{rows.length} of {data.length}</span>
        </div>
      )}

      {removeError && <div className="form-error" role="alert">{removeError}</div>}

      {data.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          action={<Link to="/app/practice" className="btn btn-primary">Start a practice set</Link>}
        >
          Use the bookmark button while practising or reviewing a mock. Save only the questions you genuinely want to revisit.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState title="No bookmarks match those filters">
          Clear the search or choose another subject to see your saved questions.
        </EmptyState>
      ) : (
        <div className="bookmark-list">
          {rows.map((row) => (
            <article className="bookmark-card" key={row.id}>
              <div className="bookmark-card-head">
                <div>
                  <span className={`subject-tag subject-${row.question.topic.subject.toLowerCase()}`}>{subjectLabel[row.question.topic.subject]}</span>
                  <span className="bookmark-topic">{row.question.topic.name}</span>
                  <span className={`difficulty difficulty-${row.question.difficulty.toLowerCase()}`}>{row.question.difficulty}</span>
                </div>
                <span className="bookmark-date">Saved {formatDate(row.createdAt)}</span>
              </div>
              <h2>{row.question.stem}</h2>
              {row.question.statement && <p className="question-statement">{row.question.statement}</p>}
              <details className="bookmark-options">
                <summary>Show saved options <ChevronDown size={15} /></summary>
                <div className="bookmark-option-grid">
                  {row.question.options.map((option) => (
                    <div key={option.id}><span>{option.label}</span>{option.text}</div>
                  ))}
                </div>
              </details>
              <div className="bookmark-card-foot">
                <span className="source-line">Source: {row.question.sourceDocument}, p. {row.question.sourcePage}</span>
                <div>
                  <Link to={`/app/practice?topic=${row.question.topic.slug}`} className="btn btn-secondary btn-sm">
                    <Sparkles size={14} /> Practise topic
                  </Link>
                  <Link to={`/app/learn/${row.question.topic.slug}`} className="btn btn-ghost btn-sm">
                    <BookOpen size={14} /> Learn
                  </Link>
                  <button type="button" className="icon-btn icon-btn-danger" onClick={() => void remove(row)} disabled={removing.has(row.id)} aria-label="Remove bookmark" title="Remove bookmark">
                    <BookmarkMinus size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="bookmark-note panel">
        <Brain size={20} />
        <p>Bookmarking is not the same as learning. Set a review day and answer each saved question again without looking at the options first.</p>
        <Bookmark size={18} className="bookmark-note-icon" />
      </div>
    </div>
  );
}
