import { z } from "zod";
import {
  defaultDentalSpecialty, getDentalSpecialty, maxSpecialtyFieldLength, specialtyFields, type SpecialtyFormMode,
} from "./dental-specialties";
import { maxToothDetailsLength, toothNumbers, toothSurfaces } from "./teeth";

const specialtyRecord = z.object({
  specialty: z.string().max(40),
  fields: z.record(z.string().max(40), z.string().trim().max(maxSpecialtyFieldLength)),
  options: z.array(z.string().max(40)).max(20),
});

const toothRecords = z.array(z.object({
  tooth: z.string().refine((tooth) => toothNumbers.has(tooth)),
  details: z.string().trim().max(maxToothDetailsLength),
  procedure: z.string().max(40).optional(),
  diagnosis: z.string().trim().max(maxToothDetailsLength).optional(),
  suggestedTreatment: z.string().trim().max(maxToothDetailsLength).optional(),
  surfaces: z.array(z.enum(Object.keys(toothSurfaces) as (keyof typeof toothSurfaces)[])).max(5).optional(),
})).max(toothNumbers.size)
  .refine((entries) => new Set(entries.map(({ tooth }) => tooth)).size === entries.length);

function parseJson(value: unknown, fallback: unknown) {
  if (value === undefined) return fallback;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function readSpecialtyRecord(value: unknown) {
  const result = specialtyRecord.safeParse(value);
  return result.success ? result.data : undefined;
}

export function parseClinicalSpecialty(fields: Record<string, unknown>, mode: SpecialtyFormMode):
  { error: string } | { specialtyData: z.output<typeof specialtyRecord>; teeth: z.output<typeof toothRecords> } {
  const data = readSpecialtyRecord(parseJson(fields.specialtyData, { specialty: defaultDentalSpecialty, fields: {}, options: [] }));
  const template = data && getDentalSpecialty(data.specialty);
  if (!data || !template) return { error: "Select a dental specialty." };

  const formFields = specialtyFields(template, mode);
  if (Object.keys(data.fields).some((key) => !formFields.some(({ id }) => id === key))
    || data.options.some((option) => !template.options.some(({ id }) => id === option))) {
    return { error: "Check that the findings and treatment options match the selected specialty." };
  }

  const teeth = toothRecords.safeParse(parseJson(fields.teeth, []));
  if (!teeth.success || teeth.data.some(({ procedure, details, diagnosis, suggestedTreatment }) => {
    if (mode === "consultation") return Boolean(procedure || suggestedTreatment) || !(details || diagnosis);
    return procedure
      ? !template.options.some(({ id, tooth }) => id === procedure && tooth)
      : !(details || suggestedTreatment);
  })) {
    return { error: mode === "consultation"
      ? "Add examination findings or a diagnosis for each selected tooth."
      : "Add findings or proposed treatment for each selected tooth, or remove teeth without details." };
  }

  return {
    specialtyData: {
      specialty: data.specialty,
      fields: Object.fromEntries(Object.entries(data.fields).filter(([, value]) => value)),
      options: [...new Set(data.options)],
    },
    teeth: teeth.data.map(({ surfaces, ...tooth }) => ({
      ...tooth, surfaces: [...new Set(surfaces)],
    })),
  };
}
