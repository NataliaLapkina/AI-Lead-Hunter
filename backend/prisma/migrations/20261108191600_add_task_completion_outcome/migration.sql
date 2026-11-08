-- CreateEnum
CREATE TYPE "TaskCompletionOutcome" AS ENUM ('CONTACTED', 'NO_RESPONSE', 'FOLLOW_UP', 'DECLINED', 'OTHER');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completionComment" TEXT,
ADD COLUMN     "completionOutcome" "TaskCompletionOutcome";
