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
