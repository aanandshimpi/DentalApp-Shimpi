-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "specialtyData" JSONB;

-- AlterTable
ALTER TABLE "TreatmentPlan" ADD COLUMN     "specialtyData" JSONB;

-- AlterTable
ALTER TABLE "TreatmentPlanTooth" ADD COLUMN     "procedure" TEXT;

-- CreateTable
CREATE TABLE "ConsultationTooth" (
    "consultationId" UUID NOT NULL,
    "tooth" VARCHAR(2) NOT NULL,
    "details" TEXT NOT NULL,

    CONSTRAINT "ConsultationTooth_pkey" PRIMARY KEY ("consultationId","tooth")
);

-- AddForeignKey
ALTER TABLE "ConsultationTooth" ADD CONSTRAINT "ConsultationTooth_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

