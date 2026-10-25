import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../prisma/data/companies.json', import.meta.url);
const companies = JSON.parse(await readFile(path, 'utf8'));

const topicSets = {
  services: [
    'number-system',
    'percentages',
    'ratio-and-proportion',
    'average',
    'time-and-work',
    'time-speed-distance',
    'data-interpretation',
    'number-series',
    'coding-and-decoding',
    'grammar-and-usage',
  ],
  consulting: [
    'percentages',
    'average',
    'ratio-and-proportion',
    'time-and-work',
    'data-interpretation',
    'number-series',
    'statement-and-conclusion',
    'grammar-and-usage',
    'vocabulary',
  ],
  product: [
    'number-system',
    'algebra',
    'progressions',
    'probability',
    'permutation-and-combination',
    'data-interpretation',
    'coding-and-decoding',
    'grammar-and-usage',
  ],
  engineering: [
    'number-system',
    'geometry-and-mensuration',
    'time-speed-distance',
    'algebra',
    'data-interpretation',
    'number-series',
    'grammar-and-usage',
  ],
};

const topicMap = {
  tcs: topicSets.services,
  infosys: topicSets.services,
  wipro: topicSets.services,
  hcltech: topicSets.services,
  'tech-mahindra': topicSets.services,
  accenture: topicSets.consulting,
  cognizant: topicSets.consulting,
  capgemini: topicSets.consulting,
  ibm: topicSets.product,
  ltimindtree: topicSets.services,
  mphasis: topicSets.services,
  coforge: topicSets.services,
  'persistent-systems': topicSets.product,
  hexaware: topicSets.services,
  ltts: topicSets.engineering,
  'dxc-technology': topicSets.consulting,
  'ntt-data': topicSets.consulting,
  cgi: topicSets.services,
  ust: topicSets.services,
  birlasoft: topicSets.services,
  'kpit-technologies': topicSets.engineering,
  'zensar-technologies': topicSets.services,
  cyient: topicSets.engineering,
  'sonata-software': topicSets.services,
  ofss: ['number-system', 'percentages', 'ratio-and-proportion', 'average', 'probability', 'algebra', 'data-interpretation', 'grammar-and-usage'],
};

const initialOverrides = { 'tech-mahindra': 'TECHM', 'dxc-technology': 'DXC', 'ntt-data': 'NTT', 'persistent-systems': 'PER', 'kpit-technologies': 'KPIT', 'zensar-technologies': 'ZEN', 'sonata-software': 'SON', ltts: 'LTTS', hcltech: 'HCL', ltimindtree: 'LTI' };

const overviews = {
  ltimindtree:
    'LTIMindtree is a global technology consulting and digital solutions company formed in 2022 through the merger of L&T Infotech and Mindtree. It is part of the Larsen & Toubro Group.',
  'dxc-technology':
    'DXC Technology is a global IT services company formed in 2017 through the merger of Computer Sciences Corporation and Hewlett Packard Enterprise Services. It provides application, cloud, infrastructure and security services.',
  ofss:
    'Oracle Financial Services Software (OFSS) is an Oracle subsidiary that provides core banking, risk management and financial services software to banks and financial institutions.',
};

function initialsFor(name) {
  const cleaned = name.replace(/\([^)]*\)/g, ' ').replace(/&/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return cleaned.length <= 4 ? cleaned.toUpperCase() : cleaned.slice(0, 3).toUpperCase();
  }
  return words
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

for (const company of companies) {
  const sourceNote = [company.sourceNote];
  let industries = company.industries ?? '';
  const techIndex = industries.indexOf('Technology domains');
  const platformIndex = industries.indexOf('Platforms / products');
  if (techIndex >= 0 && platformIndex > techIndex) {
    company.technology = industries.slice(techIndex + 'Technology domains'.length, platformIndex).replace(/^[\s.:;-]+|[\s.:;-]+$/g, '');
    company.platforms = industries.slice(platformIndex + 'Platforms / products'.length).replace(/^[\s.:;-]+|[\s.:;-]+$/g, '');
    industries = industries.slice(0, techIndex).replace(/[\s.;:-]+$/g, '');
  } else if (techIndex >= 0) {
    company.technology = industries.slice(techIndex + 'Technology domains'.length).replace(/^[\s.:;-]+|[\s.:;-]+$/g, '');
    industries = industries.slice(0, techIndex).replace(/[\s.;:-]+$/g, '');
  }
  company.industries = industries;
  if (overviews[company.slug]) company.overview = overviews[company.slug];
  if (/\(verify\)/i.test(company.headquarters ?? '')) {
    company.headquarters = company.headquarters.replace(/\s*\(verify\)\s*/gi, '').trim();
    sourceNote.push('Headquarters was flagged for verification in the source guide.');
  }
  if (!company.technology) company.technology = null;
  if (!company.platforms) company.platforms = null;
  company.initials = initialOverrides[company.slug] ?? initialsFor(company.name);
  company.topicSlugs = topicMap[company.slug] ?? [];
  company.sourceNote = sourceNote.filter(Boolean).join(' ');
}

await writeFile(path, `${JSON.stringify(companies, null, 2)}\n`, 'utf8');
console.log(`Normalised ${companies.length} company records.`);


