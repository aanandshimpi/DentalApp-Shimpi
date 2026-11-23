-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "TreatmentPlan" ADD COLUMN     "status" "TreatmentStatus" NOT NULL DEFAULT 'PLANNED';

-- AlterTable
ALTER TABLE "TreatmentPlanTooth" ADD COLUMN     "status" "TreatmentStatus" NOT NULL DEFAULT 'PLANNED';

