-- CreateEnum
CREATE TYPE "RecommendationRejectionReason" AS ENUM ('NOT_RELEVANT', 'ALREADY_DONE', 'NOT_SUITABLE_FOR_COMPANY', 'NOT_PRIORITY', 'OTHER');

-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "rejectionComment" TEXT,
ADD COLUMN     "rejectionReason" "RecommendationRejectionReason";
