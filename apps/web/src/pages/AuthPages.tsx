import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { signupSchema } from '@titanapt/shared';
import { useAuth } from '../auth/AuthContext';
import { messageFromError } from '../lib/api';
import { useDocumentTitle } from '../lib/useApi';

function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link to="/" className="brand brand-dark">
          <span className="brand-mark">TA</span>
          <span>
            <strong>TitanApt</strong>
            <small>Placement studio</small>
          </span>
        </Link>
        <div className="auth-quote">
          <Sparkles size={20} aria-hidden />
          <blockquote>“Understand the concept. Verify the answer. Review the reasoning.”</blockquote>
          <p>The TitanApt study loop</p>
        </div>
        <div className="auth-aside-facts">
          <div>
            <strong>25</strong>
            <span>focused topic lessons</span>
          </div>
          <div>
            <strong>175</strong>
            <span>answer-verified sample questions</span>
          </div>
          <div>
            <strong>0</strong>
            <span>invented company logos</span>
          </div>
        </div>
        <p className="auth-source">Content provenance is stored with every seeded question.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-back">
            <ArrowLeft size={15} /> Back to home
          </Link>
          <header>
            <span className="eyebrow">Your workspace</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Sign in to your plan" subtitle="Pick up where you left off. Your lessons, practice history and mocks are waiting.">
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <span className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Your password"
            />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} />
        </button>
      </form>
      <p className="auth-switch">
        New to TitanApt? <Link to="/signup">Create an account</Link>
      </p>
      <div className="secure-note">
        <LockKeyhole size={15} />
        <span>Your session uses an HttpOnly cookie and a same-site request token.</span>
      </div>
      {import.meta.env.DEV && (
        <div className="dev-note">
          <strong>Local development account</strong>
          <span>admin@titanapt.local · TitanAptAdmin#2026</span>
        </div>
      )}
    </AuthLayout>
  );
}

type SignupErrors = Partial<Record<'displayName' | 'email' | 'password', string[]>>;

export function SignupPage() {
  useDocumentTitle('Create an account');
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = signupSchema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await signup(parsed.data.displayName, parsed.data.email, parsed.data.password);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Build your study plan" subtitle="Create an account to track practice, complete lessons and sit timed mock tests.">
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label className="field">
          <span>Display name</span>
          <input
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            minLength={2}
            maxLength={60}
            placeholder="How should we address you?"
          />
          {errors.displayName && <small className="field-error">{errors.displayName[0]}</small>}
        </label>
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
          />
          {errors.email && <small className="field-error">{errors.email[0]}</small>}
        </label>
        <label className="field">
          <span>Password</span>
          <span className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={10}
              maxLength={128}
              placeholder="At least 10 characters"
            />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          <small className="field-help">Use at least 10 characters with a letter and a number.</small>
          {errors.password && <small className="field-error">{errors.password[0]}</small>}
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'} <ArrowRight size={16} />
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
      <div className="secure-note">
        <ShieldCheck size={15} />
        <span>No public profiles. No company logos. Your practice data stays in your account.</span>
      </div>
    </AuthLayout>
  );
}
