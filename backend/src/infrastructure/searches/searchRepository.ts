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

export async function findSearchDetailInBusiness(
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
      targetProfileId: true,
    },
  })
}

export async function findTargetProfileInBusiness(
  businessId: string,
  targetProfileId: string,
) {
  return prisma.targetProfile.findFirst({
    where: {
      id: targetProfileId,
      businessId,
    },
    select: {
      id: true,
      name: true,
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

const contactPointDetailSelect = {
  id: true,
  companyId: true,
  contactId: true,
  type: true,
  value: true,
  verificationStatus: true,
  isPrimary: true,
  sourceType: true,
  sourceLabel: true,
  sourceUrl: true,
} as const

export async function findSearchResultDetailInBusiness(
  businessId: string,
  searchId: string,
  searchResultId: string,
) {
  return prisma.searchResult.findFirst({
    where: {
      id: searchResultId,
      searchId,
      company: {
        businessId,
      },
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
          region: true,
          country: true,
          website: true,
          assessment: true,
          workState: true,
          contactPoints: {
            where: {
              businessId,
              contactId: null,
            },
            select: contactPointDetailSelect,
          },
          contacts: {
            where: {
              businessId,
            },
            select: {
              id: true,
              name: true,
              position: true,
              contactPoints: {
                where: {
                  businessId,
                },
                select: contactPointDetailSelect,
              },
            },
          },
          knowledge: {
            where: {
              businessId,
            },
            select: {
              id: true,
              content: true,
              type: true,
              verificationStatus: true,
              sourceType: true,
              sourceLabel: true,
              sourceUrl: true,
              obtainedAt: true,
              lastCheckedAt: true,
            },
          },
        },
      },
    },
  })
}
