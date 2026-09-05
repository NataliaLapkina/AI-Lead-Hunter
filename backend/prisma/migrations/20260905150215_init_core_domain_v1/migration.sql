-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "CompanyAssessment" AS ENUM ('NOT_ASSESSED', 'SUITABLE', 'NOT_SUITABLE');

-- CreateEnum
CREATE TYPE "CompanyInteractionStage" AS ENUM ('NO_CONTACT', 'CONTACTED', 'REPLIED', 'NEGOTIATION', 'CLIENT');

-- CreateEnum
CREATE TYPE "CompanyWorkState" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "CompanyOrigin" AS ENUM ('SEARCH', 'IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ContactPointType" AS ENUM ('EMAIL', 'PHONE', 'TELEGRAM', 'VK', 'WHATSAPP', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactPointVerificationStatus" AS ENUM ('VERIFIED', 'UNVERIFIED', 'INVALID', 'OUTDATED');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('FACT', 'OBSERVATION', 'AI_INFERENCE', 'USER_INFO');

-- CreateEnum
CREATE TYPE "KnowledgeVerificationStatus" AS ENUM ('VERIFIED', 'NEEDS_VERIFICATION', 'ASSUMPTION', 'OUTDATED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('USER', 'WEBSITE', 'SEARCH', 'IMPORT', 'INTERACTION', 'SYSTEM', 'OTHER');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('NEW', 'VIEWED', 'ACCEPTED', 'MODIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('EMAIL', 'PHONE', 'TELEGRAM', 'VK', 'WHATSAPP', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "InteractionDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "OutcomeType" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "SearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SearchInitiator" AS ENUM ('USER', 'SYSTEM', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "ImportFileType" AS ENUM ('XLSX', 'CSV');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'ANALYZING', 'REVIEW_REQUIRED', 'READY', 'IMPORTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportMappingOrigin" AS ENUM ('AI_SUGGESTED', 'USER_CONFIRMED', 'USER_CHANGED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DuplicateResolutionAction" AS ENUM ('MERGE', 'CREATE_SEPARATELY', 'SKIP');

-- CreateEnum
CREATE TYPE "ImportResultAction" AS ENUM ('CREATED', 'UPDATED', 'MERGED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportResultEntityType" AS ENUM ('COMPANY', 'CONTACT', 'CONTACT_POINT', 'KNOWLEDGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "problem" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceFrom" DECIMAL(65,30),
    "priceTo" DECIMAL(65,30),
    "currency" TEXT,
    "priceNote" TEXT,
    "geography" TEXT,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetProfile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "criteria" JSONB NOT NULL,
    "suggestedCriteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferTargetProfile" (
    "offerId" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,

    CONSTRAINT "OfferTargetProfile_pkey" PRIMARY KEY ("offerId","targetProfileId")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "niche" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "size" "CompanySize",
    "origin" "CompanyOrigin" NOT NULL,
    "originUrl" TEXT,
    "assessment" "CompanyAssessment" NOT NULL DEFAULT 'NOT_ASSESSED',
    "interactionStage" "CompanyInteractionStage" NOT NULL DEFAULT 'NO_CONTACT',
    "workState" "CompanyWorkState" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactPoint" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" "ContactPointType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "verificationStatus" "ContactPointVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" "SourceType",
    "sourceLabel" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Knowledge" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "interactionId" TEXT,
    "outcomeId" TEXT,
    "content" TEXT NOT NULL,
    "type" "KnowledgeType" NOT NULL,
    "verificationStatus" "KnowledgeVerificationStatus" NOT NULL,
    "sourceType" "SourceType",
    "sourceLabel" TEXT,
    "sourceUrl" TEXT,
    "obtainedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "previousKnowledgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationKnowledge" (
    "recommendationId" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,

    CONSTRAINT "RecommendationKnowledge_pkey" PRIMARY KEY ("recommendationId","knowledgeId")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT,
    "recommendationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "decidedById" TEXT NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT,
    "decisionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT,
    "contactPointId" TEXT,
    "taskId" TEXT,
    "channel" "InteractionChannel" NOT NULL,
    "direction" "InteractionDirection" NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "interactionId" TEXT,
    "type" "OutcomeType" NOT NULL,
    "summary" TEXT NOT NULL,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "offerId" TEXT,
    "targetProfileId" TEXT,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "status" "SearchStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" "SearchInitiator" NOT NULL,
    "initiatedByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isNew" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "ImportFileType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMapping" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "sourceColumnIndex" INTEGER NOT NULL,
    "sourceField" TEXT NOT NULL,
    "targetType" TEXT,
    "targetField" TEXT,
    "origin" "ImportMappingOrigin" NOT NULL,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateResolution" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "importRowId" TEXT NOT NULL,
    "candidates" JSONB NOT NULL,
    "resolution" "DuplicateResolutionAction",
    "existingCompanyId" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportResult" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "importRowId" TEXT NOT NULL,
    "action" "ImportResultAction" NOT NULL,
    "entityType" "ImportResultEntityType",
    "entityRecordId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "contactPointId" TEXT,
    "knowledgeId" TEXT,
    "changeSet" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_businessId_idx" ON "Membership"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_businessId_key" ON "Membership"("userId", "businessId");

-- CreateIndex
CREATE INDEX "Offer_businessId_idx" ON "Offer"("businessId");

-- CreateIndex
CREATE INDEX "Offer_businessId_isActive_idx" ON "Offer"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "TargetProfile_businessId_idx" ON "TargetProfile"("businessId");

-- CreateIndex
CREATE INDEX "TargetProfile_businessId_isActive_idx" ON "TargetProfile"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "OfferTargetProfile_targetProfileId_idx" ON "OfferTargetProfile"("targetProfileId");

-- CreateIndex
CREATE INDEX "Company_businessId_idx" ON "Company"("businessId");

-- CreateIndex
CREATE INDEX "Company_businessId_assessment_idx" ON "Company"("businessId", "assessment");

-- CreateIndex
CREATE INDEX "Company_businessId_interactionStage_idx" ON "Company"("businessId", "interactionStage");

-- CreateIndex
CREATE INDEX "Company_businessId_workState_idx" ON "Company"("businessId", "workState");

-- CreateIndex
CREATE INDEX "Contact_businessId_idx" ON "Contact"("businessId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "ContactPoint_businessId_idx" ON "ContactPoint"("businessId");

-- CreateIndex
CREATE INDEX "ContactPoint_companyId_idx" ON "ContactPoint"("companyId");

-- CreateIndex
CREATE INDEX "ContactPoint_contactId_idx" ON "ContactPoint"("contactId");

-- CreateIndex
CREATE INDEX "ContactPoint_companyId_type_normalizedValue_idx" ON "ContactPoint"("companyId", "type", "normalizedValue");

-- CreateIndex
CREATE INDEX "Knowledge_businessId_idx" ON "Knowledge"("businessId");

-- CreateIndex
CREATE INDEX "Knowledge_companyId_idx" ON "Knowledge"("companyId");

-- CreateIndex
CREATE INDEX "Knowledge_contactId_idx" ON "Knowledge"("contactId");

-- CreateIndex
CREATE INDEX "Knowledge_interactionId_idx" ON "Knowledge"("interactionId");

-- CreateIndex
CREATE INDEX "Knowledge_outcomeId_idx" ON "Knowledge"("outcomeId");

-- CreateIndex
CREATE INDEX "Knowledge_previousKnowledgeId_idx" ON "Knowledge"("previousKnowledgeId");

-- CreateIndex
CREATE INDEX "Knowledge_businessId_verificationStatus_idx" ON "Knowledge"("businessId", "verificationStatus");

-- CreateIndex
CREATE INDEX "Recommendation_businessId_idx" ON "Recommendation"("businessId");

-- CreateIndex
CREATE INDEX "Recommendation_companyId_idx" ON "Recommendation"("companyId");

-- CreateIndex
CREATE INDEX "Recommendation_businessId_status_idx" ON "Recommendation"("businessId", "status");

-- CreateIndex
CREATE INDEX "Recommendation_businessId_priority_idx" ON "Recommendation"("businessId", "priority");

-- CreateIndex
CREATE INDEX "RecommendationKnowledge_knowledgeId_idx" ON "RecommendationKnowledge"("knowledgeId");

-- CreateIndex
CREATE INDEX "Decision_businessId_idx" ON "Decision"("businessId");

-- CreateIndex
CREATE INDEX "Decision_companyId_idx" ON "Decision"("companyId");

-- CreateIndex
CREATE INDEX "Decision_recommendationId_idx" ON "Decision"("recommendationId");

-- CreateIndex
CREATE INDEX "Decision_decidedById_idx" ON "Decision"("decidedById");

-- CreateIndex
CREATE INDEX "Decision_businessId_status_idx" ON "Decision"("businessId", "status");

-- CreateIndex
CREATE INDEX "Task_businessId_idx" ON "Task"("businessId");

-- CreateIndex
CREATE INDEX "Task_companyId_idx" ON "Task"("companyId");

-- CreateIndex
CREATE INDEX "Task_decisionId_idx" ON "Task"("decisionId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_businessId_status_idx" ON "Task"("businessId", "status");

-- CreateIndex
CREATE INDEX "Task_businessId_dueAt_idx" ON "Task"("businessId", "dueAt");

-- CreateIndex
CREATE INDEX "Interaction_businessId_idx" ON "Interaction"("businessId");

-- CreateIndex
CREATE INDEX "Interaction_companyId_idx" ON "Interaction"("companyId");

-- CreateIndex
CREATE INDEX "Interaction_contactId_idx" ON "Interaction"("contactId");

-- CreateIndex
CREATE INDEX "Interaction_contactPointId_idx" ON "Interaction"("contactPointId");

-- CreateIndex
CREATE INDEX "Interaction_taskId_idx" ON "Interaction"("taskId");

-- CreateIndex
CREATE INDEX "Interaction_businessId_occurredAt_idx" ON "Interaction"("businessId", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_companyId_occurredAt_idx" ON "Interaction"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "Outcome_businessId_idx" ON "Outcome"("businessId");

-- CreateIndex
CREATE INDEX "Outcome_companyId_idx" ON "Outcome"("companyId");

-- CreateIndex
CREATE INDEX "Outcome_interactionId_idx" ON "Outcome"("interactionId");

-- CreateIndex
CREATE INDEX "Outcome_businessId_occurredAt_idx" ON "Outcome"("businessId", "occurredAt");

-- CreateIndex
CREATE INDEX "Outcome_companyId_occurredAt_idx" ON "Outcome"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "Outcome_businessId_type_idx" ON "Outcome"("businessId", "type");

-- CreateIndex
CREATE INDEX "Search_businessId_idx" ON "Search"("businessId");

-- CreateIndex
CREATE INDEX "Search_offerId_idx" ON "Search"("offerId");

-- CreateIndex
CREATE INDEX "Search_targetProfileId_idx" ON "Search"("targetProfileId");

-- CreateIndex
CREATE INDEX "Search_initiatedByUserId_idx" ON "Search"("initiatedByUserId");

-- CreateIndex
CREATE INDEX "Search_businessId_status_idx" ON "Search"("businessId", "status");

-- CreateIndex
CREATE INDEX "Search_businessId_createdAt_idx" ON "Search"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchResult_companyId_idx" ON "SearchResult"("companyId");

-- CreateIndex
CREATE INDEX "SearchResult_searchId_foundAt_idx" ON "SearchResult"("searchId", "foundAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchResult_searchId_companyId_key" ON "SearchResult"("searchId", "companyId");

-- CreateIndex
CREATE INDEX "Import_businessId_idx" ON "Import"("businessId");

-- CreateIndex
CREATE INDEX "Import_createdById_idx" ON "Import"("createdById");

-- CreateIndex
CREATE INDEX "Import_businessId_status_idx" ON "Import"("businessId", "status");

-- CreateIndex
CREATE INDEX "Import_businessId_createdAt_idx" ON "Import"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_importId_idx" ON "ImportRow"("importId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_importId_rowNumber_key" ON "ImportRow"("importId", "rowNumber");

-- CreateIndex
CREATE INDEX "ImportMapping_importId_idx" ON "ImportMapping"("importId");

-- CreateIndex
CREATE INDEX "ImportMapping_importId_needsReview_idx" ON "ImportMapping"("importId", "needsReview");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMapping_importId_sourceColumnIndex_key" ON "ImportMapping"("importId", "sourceColumnIndex");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateResolution_importRowId_key" ON "DuplicateResolution"("importRowId");

-- CreateIndex
CREATE INDEX "DuplicateResolution_importId_idx" ON "DuplicateResolution"("importId");

-- CreateIndex
CREATE INDEX "DuplicateResolution_existingCompanyId_idx" ON "DuplicateResolution"("existingCompanyId");

-- CreateIndex
CREATE INDEX "DuplicateResolution_resolvedById_idx" ON "DuplicateResolution"("resolvedById");

-- CreateIndex
CREATE INDEX "ImportResult_importId_idx" ON "ImportResult"("importId");

-- CreateIndex
CREATE INDEX "ImportResult_importRowId_idx" ON "ImportResult"("importRowId");

-- CreateIndex
CREATE INDEX "ImportResult_companyId_idx" ON "ImportResult"("companyId");

-- CreateIndex
CREATE INDEX "ImportResult_contactId_idx" ON "ImportResult"("contactId");

-- CreateIndex
CREATE INDEX "ImportResult_contactPointId_idx" ON "ImportResult"("contactPointId");

-- CreateIndex
CREATE INDEX "ImportResult_knowledgeId_idx" ON "ImportResult"("knowledgeId");

-- CreateIndex
CREATE INDEX "ImportResult_entityRecordId_idx" ON "ImportResult"("entityRecordId");

-- CreateIndex
CREATE INDEX "ImportResult_importId_action_idx" ON "ImportResult"("importId", "action");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetProfile" ADD CONSTRAINT "TargetProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferTargetProfile" ADD CONSTRAINT "OfferTargetProfile_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferTargetProfile" ADD CONSTRAINT "OfferTargetProfile_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "TargetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Knowledge" ADD CONSTRAINT "Knowledge_previousKnowledgeId_fkey" FOREIGN KEY ("previousKnowledgeId") REFERENCES "Knowledge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationKnowledge" ADD CONSTRAINT "RecommendationKnowledge_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationKnowledge" ADD CONSTRAINT "RecommendationKnowledge_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "Knowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_contactPointId_fkey" FOREIGN KEY ("contactPointId") REFERENCES "ContactPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "TargetProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMapping" ADD CONSTRAINT "ImportMapping_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateResolution" ADD CONSTRAINT "DuplicateResolution_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateResolution" ADD CONSTRAINT "DuplicateResolution_importRowId_fkey" FOREIGN KEY ("importRowId") REFERENCES "ImportRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateResolution" ADD CONSTRAINT "DuplicateResolution_existingCompanyId_fkey" FOREIGN KEY ("existingCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateResolution" ADD CONSTRAINT "DuplicateResolution_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportResult" ADD CONSTRAINT "ImportResult_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportResult" ADD CONSTRAINT "ImportResult_importRowId_fkey" FOREIGN KEY ("importRowId") REFERENCES "ImportRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportResult" ADD CONSTRAINT "ImportResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportResult" ADD CONSTRAINT "ImportResult_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportResult" ADD CONSTRAINT "ImportResult_contactPointId_fkey" FOREIGN KEY ("contactPointId") REFERENCES "ContactPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportResult" ADD CONSTRAINT "ImportResult_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "Knowledge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
