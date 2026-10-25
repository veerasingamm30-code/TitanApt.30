import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { useDocumentTitle } from '../lib/useApi';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  const location = useLocation();
  const insideApp = location.pathname.startsWith('/app');

  return (
    <div className={`not-found ${insideApp ? 'not-found-app' : ''}`}>
      <div className="not-found-inner">
        <span className="not-found-code">404</span>
        <Compass size={34} />
        <h1>That page is not on the map.</h1>
        <p>The link may be outdated, or the page may have moved. Your study data is unaffected.</p>
        <div>
          <Link to={insideApp ? '/app' : '/'} className="btn btn-primary">
            <ArrowLeft size={16} /> {insideApp ? 'Back to dashboard' : 'Back to home'}
          </Link>
          {insideApp && <Link to="/app/learn" className="btn btn-secondary">Browse lessons</Link>}
        </div>
      </div>
    </div>
  );
}
