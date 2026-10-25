export type ReadinessItemSeed = {
  key: string;
  title: string;
  category: 'DOCUMENT' | 'PROFILE' | 'TECHNICAL' | 'PRACTICE' | 'INTERVIEW';
  description: string;
  action: string;
  targetWeek: number;
};

export const READINESS_ITEMS: ReadinessItemSeed[] = [
  {
    key: 'resume-one-page',
    title: 'One-page resume with evidence',
    category: 'DOCUMENT',
    description: 'A concise resume with projects, measurable outcomes and the exact technologies you can defend in an interview.',
    action: 'Remove unsupported claims, add two measurable project outcomes and export a text-friendly PDF.',
    targetWeek: 1,
  },
  {
    key: 'github-profile',
    title: 'Reviewed GitHub profile',
    category: 'PROFILE',
    description: 'A public profile with pinned projects, clear README files and enough commit history to show genuine work.',
    action: 'Pin your three strongest repositories and add setup instructions, screenshots and limitations to each README.',
    targetWeek: 1,
  },
  {
    key: 'linkedin-profile',
    title: 'Complete LinkedIn profile',
    category: 'PROFILE',
    description: 'A profile that matches your resume, uses a professional photo and lists relevant skills and projects.',
    action: 'Align your headline, education dates and project descriptions with your resume.',
    targetWeek: 1,
  },
  {
    key: 'portfolio-site',
    title: 'Simple portfolio website',
    category: 'PROFILE',
    description: 'A fast, accessible site that presents your work, contact details and a short professional introduction.',
    action: 'Publish one page with three project cards, live links and a working contact method.',
    targetWeek: 2,
  },
  {
    key: 'aptitude-baseline',
    title: 'Aptitude baseline and weekly practice',
    category: 'PRACTICE',
    description: 'A completed diagnostic and a repeatable practice schedule across quantitative, logical and verbal topics.',
    action: 'Complete one practice session for each core topic and schedule three 30-minute sessions this week.',
    targetWeek: 2,
  },
  {
    key: 'sql-practice',
    title: 'SQL query practice',
    category: 'TECHNICAL',
    description: 'Comfort with SELECT, joins, grouping, subqueries and basic query debugging.',
    action: 'Write and explain ten queries covering joins, GROUP BY and a subquery.',
    targetWeek: 3,
  },
  {
    key: 'dsa-basics',
    title: 'Core DSA patterns',
    category: 'TECHNICAL',
    description: 'Ability to solve common arrays, strings, hashing, stacks, queues and searching problems with clear explanations.',
    action: 'Solve two problems per pattern and record time complexity and edge cases.',
    targetWeek: 3,
  },
  {
    key: 'cs-fundamentals',
    title: 'CS fundamentals revision',
    category: 'TECHNICAL',
    description: 'Revision notes for operating systems, DBMS, computer networks and OOP with interview-ready definitions.',
    action: 'Create one-page notes per subject and answer five interview questions aloud.',
    targetWeek: 4,
  },
  {
    key: 'mock-tests',
    title: 'Timed mock tests',
    category: 'PRACTICE',
    description: 'Completed timed tests with a review of mistakes, accuracy, speed and question-selection strategy.',
    action: 'Complete two full mocks and write down the three recurring error patterns.',
    targetWeek: 4,
  },
  {
    key: 'star-stories',
    title: 'STAR interview stories',
    category: 'INTERVIEW',
    description: 'Six structured stories covering teamwork, conflict, failure, learning, ownership and a technical challenge.',
    action: 'Write six 90-second stories and rehearse them with a timer.',
    targetWeek: 4,
  },
];
