-- CreateTable
CREATE TABLE "TreatmentPlanTooth" (
    "planId" UUID NOT NULL,
    "tooth" VARCHAR(2) NOT NULL,
    "details" TEXT NOT NULL,

    CONSTRAINT "TreatmentPlanTooth_pkey" PRIMARY KEY ("planId","tooth")
);

-- AddForeignKey
ALTER TABLE "TreatmentPlanTooth" ADD CONSTRAINT "TreatmentPlanTooth_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

