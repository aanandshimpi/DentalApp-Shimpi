-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DENTIST', 'RECEPTIONIST', 'ASSISTANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'WAITING', 'IN_VISIT', 'SEEN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SIGN_IN', 'SIGN_OUT');

-- CreateTable
CREATE TABLE "Clinic" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "clinicId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("clinicId","userId","role")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "clinicId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "registration" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMPTZ,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chair" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Chair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "chairId" UUID,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "endsAt" TIMESTAMPTZ NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "clinicId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "diagnostic" INTEGER NOT NULL,
    "inTreatment" INTEGER NOT NULL,
    "awaitingLab" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "collections" DECIMAL(12,2) NOT NULL,
    "invoiceCount" INTEGER NOT NULL,
    "followUps" INTEGER NOT NULL,
    "incompleteRecords" INTEGER NOT NULL,
    "outstanding" INTEGER NOT NULL,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("clinicId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_slug_key" ON "Clinic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_clinicId_email_key" ON "User"("clinicId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_clinicId_id_key" ON "User"("clinicId", "id");

-- CreateIndex
CREATE INDEX "Session_clinicId_userId_idx" ON "Session"("clinicId", "userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginThrottle_expiresAt_idx" ON "LoginThrottle"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_clinicId_userId_key" ON "Doctor"("clinicId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_clinicId_id_key" ON "Doctor"("clinicId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clinicId_number_key" ON "Patient"("clinicId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clinicId_id_key" ON "Patient"("clinicId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Chair_clinicId_name_key" ON "Chair"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Chair_clinicId_id_key" ON "Chair"("clinicId", "id");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_startsAt_idx" ON "Appointment"("clinicId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_doctorId_startsAt_idx" ON "Appointment"("clinicId", "doctorId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_chairId_startsAt_idx" ON "Appointment"("clinicId", "chairId", "startsAt");

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_createdAt_idx" ON "AuditLog"("clinicId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_clinicId_userId_fkey" FOREIGN KEY ("clinicId", "userId") REFERENCES "User"("clinicId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_clinicId_userId_fkey" FOREIGN KEY ("clinicId", "userId") REFERENCES "User"("clinicId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_clinicId_userId_fkey" FOREIGN KEY ("clinicId", "userId") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chair" ADD CONSTRAINT "Chair_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_patientId_fkey" FOREIGN KEY ("clinicId", "patientId") REFERENCES "Patient"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_doctorId_fkey" FOREIGN KEY ("clinicId", "doctorId") REFERENCES "Doctor"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_chairId_fkey" FOREIGN KEY ("clinicId", "chairId") REFERENCES "Chair"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardSnapshot" ADD CONSTRAINT "DashboardSnapshot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_actorId_fkey" FOREIGN KEY ("clinicId", "actorId") REFERENCES "User"("clinicId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- An appointment must have positive duration.
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_positive_duration"
  CHECK ("startsAt" < "endsAt");
