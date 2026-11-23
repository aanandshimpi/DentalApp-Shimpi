CREATE UNIQUE INDEX "Appointment_clinicId_id_patientId_key" ON "Appointment"("clinicId", "id", "patientId");

CREATE TABLE "Consultation" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "appointmentId" UUID,
    "authorId" UUID NOT NULL,
    "concern" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "assessment" TEXT,
    "plan" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Consultation_clinicId_appointmentId_patientId_key" ON "Consultation"("clinicId", "appointmentId", "patientId");
CREATE INDEX "Consultation_clinicId_createdAt_idx" ON "Consultation"("clinicId", "createdAt");
CREATE INDEX "Consultation_clinicId_patientId_createdAt_idx" ON "Consultation"("clinicId", "patientId", "createdAt");

ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_clinicId_patientId_fkey"
  FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_clinicId_appointmentId_patientId_fkey"
  FOREIGN KEY ("clinicId", "appointmentId", "patientId") REFERENCES "Appointment"("clinicId", "id", "patientId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_clinicId_authorId_fkey"
  FOREIGN KEY ("clinicId", "authorId") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
