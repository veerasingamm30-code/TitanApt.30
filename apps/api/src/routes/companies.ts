import { Router } from 'express';
import type { Company } from '@prisma/client';
import { prisma } from '../prisma.js';
import { asyncHandler, notFound } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

function companyView(company: Company) {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    initials: company.initials,
    overview: company.overview,
    website: company.website,
    headquarters: company.headquarters,
    founded: company.founded,
    parent: company.parent,
    mainBusiness: company.mainBusiness,
    industries: company.industries,
    technology: company.technology,
    platforms: company.platforms,
    careersUrl: company.careersUrl,
    logo: {
      kind: 'initials' as const,
      initials: company.initials,
      status: company.logoStatus,
      source: company.logoSource,
    },
    sourceNote: company.sourceNote,
    verifiedAt: company.verifiedAt.toISOString().slice(0, 10),
    topicSlugs: company.topicSlugs,
  };
}

companiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const companies = await prisma.company.findMany({
      where: search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { mainBusiness: { contains: search, mode: 'insensitive' } }] }
        : {},
      orderBy: { order: 'asc' },
    });
    res.json({ data: companies.map(companyView) });
  }),
);

companiesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({ where: { slug: req.params.slug } });
    if (!company) throw notFound('Company profile not found.');
    const topics = company.topicSlugs.length
      ? await prisma.topic.findMany({
          where: { slug: { in: company.topicSlugs }, isPublished: true },
          select: { slug: true, name: true, subject: true },
          orderBy: [{ subject: 'asc' }, { order: 'asc' }],
        })
      : [];
    const questionCounts = topics.length
      ? await prisma.question.groupBy({
          by: ['topicId'],
          where: {
            reviewStatus: 'APPROVED',
            topic: { slug: { in: company.topicSlugs } },
          },
          _count: { _all: true },
        })
      : [];
    const topicIds = topics.length
      ? await prisma.topic.findMany({ where: { slug: { in: company.topicSlugs } }, select: { id: true, slug: true } })
      : [];
    const slugById = new Map(topicIds.map((topic) => [topic.id, topic.slug]));
    const countBySlug = new Map(questionCounts.map((row) => [slugById.get(row.topicId) ?? '', row._count._all]));
    res.json({
      data: {
        ...companyView(company),
        learningTopics: topics.map((topic) => ({
          ...topic,
          questionCount: countBySlug.get(topic.slug) ?? 0,
        })),
      },
    });
  }),
);
