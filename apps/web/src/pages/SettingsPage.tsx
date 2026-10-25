import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, LogOut, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { apiData, messageFromError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useDocumentTitle } from '../lib/useApi';
import { PageHeader, SectionHead } from '../components/ui';
import { formatDate } from '../lib/format';

const timezones = [
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

export function SettingsPage() {
  useDocumentTitle('Settings');
  const { user, refresh, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Asia/Kolkata');
  const [dailyGoal, setDailyGoal] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setTimezone(user.timezone);
  }, [user]);

  useEffect(() => {
    apiData<{ dailyGoal: { goal: number } }>('/api/dashboard')
      .then((data) => setDailyGoal(data.dailyGoal.goal))
      .catch(() => undefined);
  }, []);

  if (!user) return null;
  const timezoneOptions = timezones.includes(user.timezone) ? timezones : [user.timezone, ...timezones];

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiData('/api/auth/profile', {
        method: 'PATCH',
        body: { displayName: displayName.trim(), timezone, dailyGoal },
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account settings"
        title="Make the workspace fit your study rhythm."
        subtitle="Update how you are addressed, your local timezone and the daily question goal used on your dashboard."
      />

      <div className="settings-layout">
        <form className="panel settings-form" onSubmit={save}>
          <SectionHead title="Profile and study plan" />
          {error && <div className="form-error" role="alert">{error}</div>}
          {saved && <div className="form-success" role="status"><CheckCircle2 size={17} /> Settings saved.</div>}

          <label className="field">
            <span><UserRound size={15} /> Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => { setDisplayName(event.target.value); setSaved(false); }}
              minLength={2}
              maxLength={60}
              required
            />
            <small className="field-help">Used in the sidebar and dashboard greeting.</small>
          </label>

          <label className="field">
            <span><Mail size={15} /> Email address</span>
            <input type="email" value={user.email} readOnly />
            <small className="field-help">Email changes are not available in this local build.</small>
          </label>

          <div className="form-row">
            <label className="field">
              <span><Clock3 size={15} /> Timezone</span>
              <select value={timezone} onChange={(event) => { setTimezone(event.target.value); setSaved(false); }}>
                {timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
              </select>
              <small className="field-help">Used for streaks and the local-day goal.</small>
            </label>
            <label className="field">
              <span>Daily question goal</span>
              <input
                type="number"
                min={5}
                max={100}
                value={dailyGoal}
                onChange={(event) => { setDailyGoal(Number(event.target.value)); setSaved(false); }}
                required
              />
              <small className="field-help">Between 5 and 100 questions per day.</small>
            </label>
          </div>

          <div className="settings-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || displayName.trim().length < 2}>
              {saving ? 'Saving…' : 'Save changes'} <Save size={16} />
            </button>
          </div>
        </form>

        <aside className="settings-aside">
          <div className="panel account-card">
            <span className="avatar avatar-large">{user.displayName.slice(0, 1).toUpperCase()}</span>
            <h2>{user.displayName}</h2>
            <p>{user.email}</p>
            <span className="badge badge-info">{user.role === 'ADMIN' ? 'Administrator' : user.role === 'REVIEWER' ? 'Reviewer' : 'Learner'}</span>
            <dl className="fact-list">
              <div><dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>
              <div><dt>Workspace</dt><dd>TitanApt local</dd></div>
              <div><dt>Data scope</dt><dd>Private to your account</dd></div>
            </dl>
            {(user.role === 'ADMIN' || user.role === 'REVIEWER') && (
              <Link to="/app/admin" className="btn btn-secondary btn-block">Open admin workspace <ArrowRight size={15} /></Link>
            )}
          </div>

          <div className="panel security-note">
            <ShieldCheck size={21} />
            <h3>Session security</h3>
            <p>You are signed in with an HttpOnly session cookie and a same-site request token. Password changes and account deletion are not included in this build.</p>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => void logout()}>
              <LogOut size={16} /> Sign out of this device
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
