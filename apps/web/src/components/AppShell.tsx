import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bookmark,
  BookOpen,
  Brain,
  Building2,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const learnerNav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/learn', label: 'Learn', icon: BookOpen },
  { to: '/app/practice', label: 'Practice', icon: Brain },
  { to: '/app/mocks', label: 'Mock tests', icon: FileClock },
  { to: '/app/companies', label: 'Companies', icon: Building2 },
  { to: '/app/readiness', label: 'Readiness', icon: ClipboardCheck },
  { to: '/app/progress', label: 'Progress', icon: BarChart3 },
  { to: '/app/bookmarks', label: 'Bookmarks', icon: Bookmark },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

  const title = [...learnerNav, { to: '/app/admin', label: 'Admin' }, { to: '/app/settings', label: 'Settings' }]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label;

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <Link to="/app" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark">TA</span>
            <span>
              <strong>TitanApt</strong>
              <small>Placement studio</small>
            </span>
          </Link>
          <button className="icon-btn sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section">Workspace</span>
          {learnerNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} aria-hidden />
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <span className="nav-section">Review desk</span>
              <NavLink
                to="/app/admin"
                onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <ShieldCheck size={18} aria-hidden />
                Admin
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <NavLink to="/app/settings" className="nav-link" onClick={() => setOpen(false)}>
            <Settings size={18} aria-hidden />
            Settings
          </NavLink>
          <button type="button" className="nav-link nav-button" onClick={() => void logout()}>
            <LogOut size={18} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {open && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-btn" type="button" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu size={21} />
            </button>
            <span className="topbar-context">{title ?? 'TitanApt'}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              {new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
            </span>
            <Link to="/app/settings" className="user-chip" aria-label="Open settings">
              <span className="avatar">{user?.displayName?.slice(0, 1).toUpperCase() ?? 'T'}</span>
              <span className="user-copy">
                <strong>{user?.displayName}</strong>
                <small>{user?.role === 'LEARNER' ? 'Learner' : user?.role === 'ADMIN' ? 'Administrator' : 'Reviewer'}</small>
              </span>
            </Link>
          </div>
        </header>
        <main id="main-content" className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppPage({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
