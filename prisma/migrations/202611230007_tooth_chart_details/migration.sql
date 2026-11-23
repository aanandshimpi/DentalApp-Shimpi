-- AlterTable
ALTER TABLE "ConsultationTooth" ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "surfaces" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "TreatmentPlanTooth" ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "suggestedTreatment" TEXT,
ADD COLUMN     "surfaces" TEXT[] DEFAULT ARRAY[]::TEXT[];

