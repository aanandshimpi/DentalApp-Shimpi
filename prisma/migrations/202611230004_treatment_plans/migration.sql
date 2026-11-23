-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "consultationId" UUID,
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "followUp" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreatmentPlan_clinicId_createdAt_idx" ON "TreatmentPlan"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "TreatmentPlan_clinicId_patientId_createdAt_idx" ON "TreatmentPlan"("clinicId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "TreatmentPlan_clinicId_consultationId_createdAt_idx" ON "TreatmentPlan"("clinicId", "consultationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_clinicId_id_patientId_key" ON "Consultation"("clinicId", "id", "patientId");

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_clinicId_patientId_fkey" FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_clinicId_consultationId_patientId_fkey" FOREIGN KEY ("clinicId", "consultationId", "patientId") REFERENCES "Consultation"("clinicId", "id", "patientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_clinicId_authorId_fkey" FOREIGN KEY ("clinicId", "authorId") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

