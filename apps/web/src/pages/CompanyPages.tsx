import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ExternalLink,
  Globe2,
  Layers3,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Subject } from '@titanapt/shared';
import { useApi, useDocumentTitle } from '../lib/useApi';
import { CompanyMark, ErrorState, Loader, PageHeader, StatCard } from '../components/ui';
import { subjectLabel, subjectShort } from '../lib/format';

type CompanyLogo = { kind: 'initials'; initials: string; status: string; source: string | null };

type CompanySummary = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  overview: string;
  website: string | null;
  headquarters: string | null;
  founded: string | null;
  parent: string | null;
  mainBusiness: string | null;
  industries: string | null;
  technology: string | null;
  platforms: string | null;
  careersUrl: string | null;
  logo: CompanyLogo;
  sourceNote: string;
  verifiedAt: string;
  topicSlugs: string[];
};

type CompanyDetail = CompanySummary & {
  learningTopics: Array<{ slug: string; name: string; subject: Subject; questionCount: number }>;
};

export function CompaniesPage() {
  useDocumentTitle('Company guide');
  const { data, loading, error, reload } = useApi<CompanySummary[]>('/api/companies');
  const [query, setQuery] = useState('');

  const companies = useMemo(() => {
    if (!data) return [];
    const term = query.trim().toLowerCase();
    if (!term) return data;
    return data.filter((company) =>
      [company.name, company.overview, company.mainBusiness, company.industries, company.technology, company.platforms]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [data, query]);

  if (loading) return <Loader label="Loading company profiles" />;
  if (error || !data) return <ErrorState message={error ?? 'Company guide unavailable.'} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow={`${data.length} company profiles`}
        title="Understand the company before the interview."
        subtitle="Business context, technology exposure and mapped aptitude topics for the IT employers most relevant to placement season."
      />

      <div className="company-integrity panel">
        <ShieldCheck size={22} />
        <div>
          <strong>Typography-only company marks</strong>
          <p>No official logo artwork was supplied in the source guide, so TitanApt never imitates a company logo. Each profile uses a typographic initials mark and carries its own source note.</p>
        </div>
      </div>

      <div className="company-toolbar">
        <label className="search-field">
          <Search size={17} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by company, industry or technology"
            aria-label="Search companies"
          />
        </label>
        <span>{companies.length} of {data.length} profiles</span>
      </div>

      {companies.length === 0 ? (
        <div className="empty-state">
          <Building2 size={30} />
          <h3>No company matches “{query}”</h3>
          <p>Try a broader term such as “banking”, “cloud” or “consulting”.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setQuery('')}>Clear search</button>
        </div>
      ) : (
        <div className="company-grid">
          {companies.map((company) => (
            <Link to={`/app/companies/${company.slug}`} key={company.id} className="company-card">
              <div className="company-card-top">
                <CompanyMark initials={company.initials} size="md" />
                <span className="company-industry">{company.industries?.split(',')[0] ?? 'IT services'}</span>
              </div>
              <h2>{company.name}</h2>
              <p>{company.overview}</p>
              <div className="company-card-meta">
                <span><MapPin size={14} /> {company.headquarters ?? '—'}</span>
                <span><Layers3 size={14} /> {company.topicSlugs.length} mapped topics</span>
              </div>
              <span className="company-card-link">View profile <ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompanyDetailPage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi<CompanyDetail>(slug ? `/api/companies/${slug}` : null);
  useDocumentTitle(data?.name ?? 'Company profile');

  if (loading) return <Loader label="Loading company profile" />;
  if (error || !data) return <ErrorState message={error ?? 'Company profile unavailable.'} onRetry={reload} />;

  const totalQuestions = data.learningTopics.reduce((sum, topic) => sum + topic.questionCount, 0);
  const subjects = new Set(data.learningTopics.map((topic) => topic.subject));

  return (
    <div>
      <Link to="/app/companies" className="back-link"><ArrowLeft size={15} /> All companies</Link>

      <header className="company-hero">
        <div className="company-hero-identity">
          <CompanyMark initials={data.initials} size="lg" />
          <div>
            <span className="eyebrow">Company profile · {data.verifiedAt}</span>
            <h1>{data.name}</h1>
            <p>{data.overview}</p>
            <div className="company-hero-actions">
              <Link to={`/app/practice?company=${data.slug}&companyName=${encodeURIComponent(data.name)}`} className="btn btn-primary">
                Practise mapped topics <ArrowRight size={16} />
              </Link>
              {data.careersUrl && (
                <a className="btn btn-secondary" href={data.careersUrl} target="_blank" rel="noreferrer noopener">
                  Careers <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>
        </div>
        <aside className="company-hero-facts">
          <div><MapPin size={17} /><span>Headquarters</span><strong>{data.headquarters ?? 'Not stated'}</strong></div>
          <div><CalendarDays size={17} /><span>Founded</span><strong>{data.founded ?? 'Not stated'}</strong></div>
          <div><BriefcaseBusiness size={17} /><span>Parent</span><strong>{data.parent ?? 'Independent'}</strong></div>
          {data.website && (
            <a href={data.website} target="_blank" rel="noreferrer noopener">
              <Globe2 size={17} /><span>Website</span><strong>Visit site <ArrowUpRight size={13} /></strong>
            </a>
          )}
        </aside>
      </header>

      <div className="stat-grid company-stats">
        <StatCard label="Mapped topics" value={data.learningTopics.length} note="from the source guide" />
        <StatCard label="Verified questions" value={totalQuestions} note="in mapped topic banks" />
        <StatCard label="Subjects covered" value={subjects.size} note="aptitude and reasoning" />
        <StatCard label="Logo status" value="Initials" note="official artwork not supplied" />
      </div>

      <div className="company-detail-grid">
        <section className="panel company-about">
          <h2>What the company does</h2>
          <p>{data.mainBusiness ?? data.overview}</p>

          <div className="fact-block">
            <span className="eyebrow">Industries served</span>
            <div className="tag-cloud">
              {(data.industries?.split(',').map((item) => item.trim()).filter(Boolean) ?? []).map((item) => (
                <span className="plain-tag" key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="fact-block">
            <span className="eyebrow">Technology exposure</span>
            <p>{data.technology ?? 'Not stated in the source profile.'}</p>
          </div>

          <div className="fact-block">
            <span className="eyebrow">Platforms and products</span>
            <p>{data.platforms ?? 'Not stated in the source profile.'}</p>
          </div>

          <div className="company-source">
            <span className="eyebrow">Source note</span>
            <p>{data.sourceNote}</p>
            <small>{data.logo.status}</small>
          </div>
        </section>

        <aside className="panel company-topics">
          <div className="section-head">
            <h2>Prepare for this company</h2>
            <span className="panel-note">{totalQuestions} verified questions</span>
          </div>
          <p className="muted">These topic mappings come from the source guide. Use them as a starting point, not a claim about a live hiring pattern.</p>
          <div className="company-topic-list">
            {data.learningTopics.map((topic) => (
              <div className="company-topic-row" key={topic.slug}>
                <div>
                  <span className={`subject-tag subject-${topic.subject.toLowerCase()}`}>{subjectShort[topic.subject]}</span>
                  <strong>{topic.name}</strong>
                  <small>{subjectLabel[topic.subject]} · {topic.questionCount} verified</small>
                </div>
                <div className="company-topic-actions">
                  <Link to={`/app/learn/${topic.slug}`} className="icon-btn" aria-label={`Learn ${topic.name}`} title="Open lesson">
                    <BookOpen size={16} />
                  </Link>
                  <Link to={`/app/practice?topic=${topic.slug}`} className="icon-btn" aria-label={`Practice ${topic.name}`} title="Practise topic">
                    <Sparkles size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Link to={`/app/practice?company=${data.slug}&companyName=${encodeURIComponent(data.name)}`} className="btn btn-primary btn-block">
            Build a company-focused set <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
