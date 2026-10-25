import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';

export function Loader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={26} aria-hidden />
      <p>{label}…</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block state-error" role="alert">
      <AlertTriangle size={26} aria-hidden />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Inbox size={30} aria-hidden />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label ?? 'Progress'}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function CompanyMark({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
  const hue = [...initials].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return (
    <span
      className={`company-mark company-mark-${size}`}
      style={{ '--mark-hue': `${hue}` } as React.CSSProperties}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function StatCard({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-card" aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="skeleton-line" style={{ width: `${90 - index * 12}%` }} />
      ))}
    </div>
  );
}
