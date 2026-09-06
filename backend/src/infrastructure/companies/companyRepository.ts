import { CompanyAssessment, CompanyWorkState } from '@prisma/client'
import { prisma } from '../prisma.js'

export async function findBusinessById(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  })
}

export async function findWorkingCompaniesByBusinessId(businessId: string) {
  return prisma.company.findMany({
    where: {
      businessId,
      workState: {
        not: CompanyWorkState.NOT_STARTED,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      website: true,
      niche: true,
      city: true,
      assessment: true,
      interactionStage: true,
      workState: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function findCompanyInBusiness(
  businessId: string,
  companyId: string,
) {
  return prisma.company.findFirst({
    where: {
      id: companyId,
      businessId,
    },
    select: { id: true },
  })
}

export async function findCompanyWorkContextInBusiness(
  businessId: string,
  companyId: string,
) {
  return prisma.company.findFirst({
    where: {
      id: companyId,
      businessId,
    },
    select: {
      id: true,
      assessment: true,
      workState: true,
      updatedAt: true,
    },
  })
}

export async function updateCompanyAssessmentField(
  companyId: string,
  assessment: CompanyAssessment,
) {
  return prisma.company.update({
    where: { id: companyId },
    data: {
      assessment,
    },
    select: {
      id: true,
      assessment: true,
      updatedAt: true,
    },
  })
}

export type StartedCompanyWorkRow = {
  id: string
  workState: CompanyWorkState
  updatedAt: Date
}

export async function tryStartCompanyWorkAtomic(
  businessId: string,
  companyId: string,
): Promise<StartedCompanyWorkRow | null> {
  // Prisma updateMany cannot RETURNING; use parameterized UPDATE ... RETURNING.
  // updatedAt is set explicitly: raw SQL bypasses Prisma @updatedAt.
  const rows = await prisma.$queryRaw<StartedCompanyWorkRow[]>`
    UPDATE "Company"
    SET
      "workState" = CAST(${CompanyWorkState.ACTIVE} AS "CompanyWorkState"),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      id = ${companyId}
      AND "businessId" = ${businessId}
      AND assessment = CAST(${CompanyAssessment.SUITABLE} AS "CompanyAssessment")
      AND "workState" = CAST(${CompanyWorkState.NOT_STARTED} AS "CompanyWorkState")
    RETURNING id, "workState", "updatedAt"
  `

  return rows[0] ?? null
}
