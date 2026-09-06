import { prisma } from '../prisma.js'

export async function findSearchInBusiness(
  businessId: string,
  searchId: string,
) {
  return prisma.search.findFirst({
    where: {
      id: searchId,
      businessId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      startedAt: true,
      finishedAt: true,
    },
  })
}

export async function findSearchResultsWithCompanyContext(
  businessId: string,
  searchId: string,
) {
  return prisma.searchResult.findMany({
    where: {
      searchId,
      company: {
        businessId,
      },
    },
    orderBy: {
      foundAt: 'asc',
    },
    select: {
      id: true,
      source: true,
      sourceUrl: true,
      foundAt: true,
      company: {
        select: {
          id: true,
          name: true,
          niche: true,
          city: true,
          website: true,
          assessment: true,
          workState: true,
          contactPoints: {
            where: {
              businessId,
            },
            select: {
              type: true,
            },
          },
          knowledge: {
            where: {
              businessId,
            },
            select: {
              content: true,
              type: true,
              verificationStatus: true,
            },
          },
        },
      },
    },
  })
}
