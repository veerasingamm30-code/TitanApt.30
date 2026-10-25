import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { LearnPage, LessonPage, TopicPage } from './pages/LearnPages';
import { PracticePage, PracticeSessionPage } from './pages/PracticePages';
import { MockAttemptPage, MockDetailPage, MocksPage } from './pages/MockPages';
import { CompaniesPage, CompanyDetailPage } from './pages/CompanyPages';
import { ReadinessPage } from './pages/ReadinessPage';
import { ProgressPage } from './pages/ProgressPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  AdminAuditPage,
  AdminFlagsPage,
  AdminImportsPage,
  AdminLayout,
  AdminMocksPage,
  AdminOverviewPage,
  AdminQuestionsPage,
} from './pages/AdminPages';
import { NotFoundPage } from './pages/NotFoundPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="learn" element={<LearnPage />} />
            <Route path="learn/:topicSlug" element={<TopicPage />} />
            <Route path="learn/:topicSlug/lessons/:lessonId" element={<LessonPage />} />
            <Route path="lessons/:lessonId" element={<LessonPage />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="practice/:sessionId" element={<PracticeSessionPage />} />
            <Route path="mocks" element={<MocksPage />} />
            <Route path="mocks/attempts/:attemptId" element={<MockAttemptPage />} />
            <Route path="mocks/:slug" element={<MockDetailPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="companies/:slug" element={<CompanyDetailPage />} />
            <Route path="readiness" element={<ReadinessPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="bookmarks" element={<BookmarksPage />} />
            <Route path="settings" element={<SettingsPage />} />

            <Route element={<ProtectedRoute roles={['ADMIN', 'REVIEWER']} />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="questions" element={<AdminQuestionsPage />} />
                <Route path="flags" element={<AdminFlagsPage />} />
                <Route path="imports" element={<AdminImportsPage />} />
                <Route path="mocks" element={<AdminMocksPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
