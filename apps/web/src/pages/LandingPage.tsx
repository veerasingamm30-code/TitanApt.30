import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useDocumentTitle } from '../lib/useApi';

const companies = ['TCS', 'Infosys', 'Wipro', 'HCLTech', 'Accenture', 'Cognizant', 'Capgemini', 'IBM', 'LTIMindtree', 'DXC', 'NTT DATA', 'CGI'];

const features = [
  {
    icon: BookOpenCheck,
    title: 'Lessons that explain the why',
    body: 'Objectives, analogies, worked examples, rules, common mistakes and memory cues — one focused lesson for every topic.',
  },
  {
    icon: BrainCircuit,
    title: 'Practice with immediate reasoning',
    body: 'Answer a question, see the verified correct option and review a step-by-step explanation before moving on.',
  },
  {
    icon: Clock3,
    title: 'Timed, sectioned mock tests',
    body: 'Build exam stamina with a live countdown, question navigation, saved answers and placement-style marking.',
  },
  {
    icon: Building2,
    title: 'Company intelligence, honestly sourced',
    body: 'Explore 25 IT-company profiles. No invented logos, no fake company papers, and source notes on every profile.',
  },
  {
    icon: BarChart3,
    title: 'Progress you can act on',
    body: 'Track accuracy by subject, find weak topics, maintain a daily goal and see exactly what to do next.',
  },
  {
    icon: ClipboardList,
    title: 'A placement-readiness checklist',
    body: 'Resume, GitHub, SQL, DSA, fundamentals, mocks and STAR stories — a practical checklist across the season.',
  },
];

const steps = [
  { number: '01', title: 'Set your baseline', body: 'Take the foundation mock or start with a topic you want to strengthen.' },
  { number: '02', title: 'Learn, then answer', body: 'Work through a focused lesson and complete its verified checkpoint questions.' },
  { number: '03', title: 'Review the pattern', body: 'Use your accuracy and recent mistakes to choose the next practice set.' },
  { number: '04', title: 'Perform under time', body: 'Sit a timed mock, review every missed question and repeat with a clearer plan.' },
];

export function LandingPage() {
  useDocumentTitle('Aptitude learning and placement preparation');
  const { user } = useAuth();

  return (
    <div className="marketing">
      <header className="marketing-nav">
        <Link to="/" className="brand brand-dark">
          <span className="brand-mark">TA</span>
          <span>
            <strong>TitanApt</strong>
            <small>Placement studio</small>
          </span>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#approach">Approach</a>
          <a href="#curriculum">Curriculum</a>
          <a href="#companies">Companies</a>
          <a href="#integrity">Content standards</a>
        </nav>
        <div className="marketing-actions">
          {user ? (
            <Link to="/app" className="btn btn-primary">
              Open workspace <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Start free <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-light">
              <Sparkles size={14} /> Built for the placement season
            </span>
            <h1>Aptitude, made deliberate.</h1>
            <p className="hero-lead">
              Learn one concept properly. Practise with verified answers. Walk into every placement test with a plan
              instead of a pile of PDFs.
            </p>
            <div className="hero-actions">
              <Link to={user ? '/app' : '/signup'} className="btn btn-accent btn-lg">
                {user ? 'Continue learning' : 'Create your study plan'} <ArrowRight size={18} />
              </Link>
              <a href="#approach" className="btn btn-outline-light btn-lg">
                See how it works
              </a>
            </div>
            <div className="hero-proof">
              <div>
                <strong>25</strong>
                <span>core topics</span>
              </div>
              <div>
                <strong>175</strong>
                <span>answer-verified questions</span>
              </div>
              <div>
                <strong>25</strong>
                <span>company profiles</span>
              </div>
            </div>
            <p className="hero-source">
              This build seeds verified samples from the supplied 10,000-question source. Full-document import remains
              an explicit admin workflow, not a marketing claim.
            </p>
          </div>

          <div className="hero-visual" aria-label="Preview of a TitanApt study dashboard">
            <div className="preview-window">
              <div className="preview-top">
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-title">Today · Study plan</span>
              </div>
              <div className="preview-body">
                <div className="preview-greeting">
                  <div>
                    <small>GOOD MORNING</small>
                    <h2>Your focus for today</h2>
                  </div>
                  <span className="preview-streak"><Target size={16} /> 6-day streak</span>
                </div>
                <div className="preview-focus">
                  <span className="preview-tag">NEXT LESSON · 12 MIN</span>
                  <h3>Percentages: change without confusion</h3>
                  <p>Turn every percentage into a multiplier. Multiply forward; divide backward.</p>
                  <span className="preview-progress"><span style={{ width: '42%' }} /></span>
                  <div className="preview-focus-foot">
                    <span>Quantitative aptitude</span>
                    <span>Resume lesson</span>
                  </div>
                </div>
                <div className="preview-grid">
                  <div>
                    <small>ACCURACY</small>
                    <strong>72.4%</strong>
                    <span className="trend-up">+8.2% this week</span>
                  </div>
                  <div>
                    <small>SOLVED</small>
                    <strong>146</strong>
                    <span>14 today</span>
                  </div>
                  <div>
                    <small>LESSONS</small>
                    <strong>9/25</strong>
                    <span>36% complete</span>
                  </div>
                </div>
                <div className="preview-chart">
                  {[36, 52, 44, 68, 58, 76, 70, 88, 64, 91, 78, 96].map((height, index) => (
                    <span key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="floating-card floating-card-one">
              <LineChart size={20} />
              <div>
                <strong>Weak area found</strong>
                <span>Practice Probability</span>
              </div>
            </div>
            <div className="floating-card floating-card-two">
              <CheckCircle2 size={20} />
              <div>
                <strong>Checkpoint passed</strong>
                <span>Time & Work · 3/3</span>
              </div>
            </div>
          </div>
        </section>

        <section className="company-strip" id="companies" aria-label="Company profiles">
          <span className="strip-label">Company intelligence for</span>
          <div className="strip-names">
            {companies.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </section>

        <section className="section marketing-section" id="approach">
          <div className="section-intro">
            <span className="eyebrow">The approach</span>
            <h2>Less collecting. More deliberate work.</h2>
            <p>
              TitanApt is organised around a simple loop: understand a concept, answer verified questions, review the
              reasoning, then use your data to choose what comes next.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <feature.icon size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section steps-section" id="curriculum">
          <div className="steps-copy">
            <span className="eyebrow">A season, not a scramble</span>
            <h2>Four moves that keep the preparation honest.</h2>
            <p>
              No streaks for their own sake. Every session should either teach you something, test what you know, or
              make the next decision clearer.
            </p>
            <Link to="/signup" className="btn btn-primary">
              Build your plan <ArrowRight size={16} />
            </Link>
          </div>
          <div className="steps-list">
            {steps.map((step) => (
              <div className="step-row" key={step.number}>
                <span className="step-number">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section curriculum-section">
          <div className="curriculum-head">
            <div>
              <span className="eyebrow">One connected curriculum</span>
              <h2>From number systems to the interview room.</h2>
            </div>
            <p>
              Twenty-five core chapters across quantitative aptitude, logical reasoning, verbal ability and data
              interpretation — each with a lesson, checkpoints and practice questions.
            </p>
          </div>
          <div className="curriculum-grid">
            <div className="curriculum-card">
              <span className="curriculum-icon"><BrainCircuit size={22} /></span>
              <h3>Quantitative aptitude</h3>
              <p>Arithmetic, commercial maths, algebra, counting, probability and mensuration.</p>
              <span className="curriculum-count">14 topics</span>
            </div>
            <div className="curriculum-card">
              <span className="curriculum-icon"><FileCheck2 size={22} /></span>
              <h3>Logical reasoning</h3>
              <p>Series, coding, family trees, directions, arrangements, syllogisms and conclusions.</p>
              <span className="curriculum-count">8 topics</span>
            </div>
            <div className="curriculum-card">
              <span className="curriculum-icon"><BookOpenCheck size={22} /></span>
              <h3>Verbal ability</h3>
              <p>Grammar, usage, vocabulary in context and the editing discipline placement tests reward.</p>
              <span className="curriculum-count">2 topics</span>
            </div>
            <div className="curriculum-card">
              <span className="curriculum-icon"><BarChart3 size={22} /></span>
              <h3>Data interpretation</h3>
              <p>Read the axes, respect the units, compare the right values and calculate only what is asked.</p>
              <span className="curriculum-count">1 topic + mocks</span>
            </div>
          </div>
        </section>

        <section className="integrity-section" id="integrity">
          <div className="integrity-copy">
            <span className="eyebrow eyebrow-light">Content standards</span>
            <h2>No fake logos. No pretend company papers.</h2>
            <p>
              The supplied company guide explicitly notes that official logos were not included. TitanApt uses
              typographic initials instead. Company mocks are labelled as original practice material, and every
              seeded question carries a source document, source key and review state.
            </p>
            <div className="integrity-points">
              <span><ShieldCheck size={17} /> Source-linked questions</span>
              <span><CheckCircle2 size={17} /> Pending items excluded from practice</span>
              <span><Building2 size={17} /> Initials-only company marks</span>
            </div>
          </div>
          <div className="integrity-card">
            <span className="integrity-label">Question provenance</span>
            <div className="provenance-row">
              <span>Source</span>
              <strong>TitanApt_10000.pdf</strong>
            </div>
            <div className="provenance-row">
              <span>Sample key</span>
              <strong>TA10K-01-Q1</strong>
            </div>
            <div className="provenance-row">
              <span>Review state</span>
              <strong>Approved · answer checked</strong>
            </div>
            <div className="provenance-row">
              <span>Visible to learners</span>
              <strong>Yes</strong>
            </div>
            <p>Every practice item is traceable. Unreviewed content never reaches a learner.</p>
          </div>
        </section>

        <section className="section final-cta">
          <div>
            <span className="eyebrow">Ready when you are</span>
            <h2>Start with one honest baseline.</h2>
            <p>Create an account, take the foundation mock, and let the next session choose itself.</p>
          </div>
          <div className="final-actions">
            <Link to={user ? '/app' : '/signup'} className="btn btn-accent btn-lg">
              {user ? 'Open workspace' : 'Create account'} <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-outline-light btn-lg">
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <Link to="/" className="brand brand-dark">
          <span className="brand-mark">TA</span>
          <span>
            <strong>TitanApt</strong>
            <small>Placement studio</small>
          </span>
        </Link>
        <p>Original learning content. Source-linked question samples. Built for deliberate preparation.</p>
        <span>© {new Date().getFullYear()} TitanApt</span>
      </footer>
    </div>
  );
}
