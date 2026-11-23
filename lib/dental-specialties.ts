type Field = { id: string; label: string };
type TreatmentOption = Field & { tooth?: true };

type SpecialtyTemplate = {
  label: string;
  findings: readonly Field[];
  planning: readonly Field[];
  options: readonly TreatmentOption[];
};

export const dentalSpecialties: Record<string, SpecialtyTemplate> = {
  general: {
    label: "General dentistry",
    findings: [
      { id: "restorative", label: "Caries and restoration findings" },
      { id: "soft-tissues", label: "Soft tissue findings" },
    ],
    planning: [{ id: "priorities", label: "Care priorities" }],
    options: [
      { id: "restoration", label: "Direct restoration", tooth: true },
      { id: "preventive-care", label: "Preventive care" },
      { id: "review", label: "Review or monitoring" },
    ],
  },
  endodontics: {
    label: "Endodontics",
    findings: [
      { id: "pulp-testing", label: "Pulp sensibility testing" },
      { id: "periapical", label: "Percussion and periapical findings" },
      { id: "imaging", label: "Endodontic imaging findings" },
    ],
    planning: [
      { id: "pulpal-diagnosis", label: "Pulpal diagnosis" },
      { id: "apical-diagnosis", label: "Apical diagnosis" },
    ],
    options: [
      { id: "root-canal", label: "Root canal treatment", tooth: true },
      { id: "retreatment", label: "Endodontic retreatment", tooth: true },
      { id: "vital-pulp", label: "Vital pulp therapy", tooth: true },
      { id: "endo-referral", label: "Endodontic referral" },
    ],
  },
  periodontics: {
    label: "Periodontics",
    findings: [
      { id: "probing", label: "Probing depths and bleeding" },
      { id: "attachment", label: "Attachment loss and recession" },
      { id: "mobility", label: "Mobility and furcation findings" },
    ],
    planning: [
      { id: "sites", label: "Sites or quadrants planned" },
      { id: "maintenance", label: "Maintenance and review plan" },
    ],
    options: [
      { id: "debridement", label: "Periodontal debridement", tooth: true },
      { id: "perio-surgery", label: "Periodontal surgery", tooth: true },
      { id: "perio-maintenance", label: "Periodontal maintenance" },
    ],
  },
  orthodontics: {
    label: "Orthodontics",
    findings: [
      { id: "occlusion", label: "Occlusion and bite findings" },
      { id: "alignment", label: "Crowding, spacing, and alignment" },
      { id: "eruption", label: "Eruption and dentition findings" },
    ],
    planning: [
      { id: "objectives", label: "Alignment and bite objectives" },
      { id: "appliance", label: "Appliance and retention notes" },
    ],
    options: [
      { id: "fixed-appliance", label: "Fixed appliance" },
      { id: "clear-aligners", label: "Clear aligners" },
      { id: "retention", label: "Retention" },
      { id: "tooth-movement", label: "Tooth movement or repositioning", tooth: true },
    ],
  },
  prosthodontics: {
    label: "Prosthodontics",
    findings: [
      { id: "missing-teeth", label: "Missing teeth and edentulous areas" },
      { id: "abutments", label: "Abutment and existing prosthesis findings" },
      { id: "occlusion", label: "Occlusion and functional findings" },
    ],
    planning: [
      { id: "design", label: "Prosthesis design and supported sites" },
      { id: "lab", label: "Laboratory and material notes" },
    ],
    options: [
      { id: "crown", label: "Crown", tooth: true },
      { id: "bridge", label: "Fixed bridge" },
      { id: "denture", label: "Removable denture" },
      { id: "implant-prosthesis", label: "Implant-supported restoration", tooth: true },
    ],
  },
  pediatric: {
    label: "Pediatric dentistry",
    findings: [
      { id: "dentition", label: "Dentition and eruption stage" },
      { id: "caries-risk", label: "Caries risk and findings" },
      { id: "visit-support", label: "Visit support and caregiver observations" },
    ],
    planning: [
      { id: "prevention", label: "Prevention and caregiver discussion" },
      { id: "visit-plan", label: "Visit and follow-up plan" },
    ],
    options: [
      { id: "sealant", label: "Pit and fissure sealant", tooth: true },
      { id: "pediatric-restoration", label: "Pediatric restoration", tooth: true },
      { id: "space-maintenance", label: "Space maintenance" },
      { id: "fluoride", label: "Fluoride treatment" },
    ],
  },
  oralSurgery: {
    label: "Oral and maxillofacial surgery",
    findings: [
      { id: "site", label: "Surgical site and examination findings" },
      { id: "imaging", label: "Imaging and anatomical findings" },
      { id: "history", label: "Relevant medical and surgical history" },
    ],
    planning: [
      { id: "site-plan", label: "Planned surgical site and scope" },
      { id: "discussion", label: "Risks and alternatives discussed" },
    ],
    options: [
      { id: "extraction", label: "Extraction", tooth: true },
      { id: "surgical-extraction", label: "Surgical extraction", tooth: true },
      { id: "biopsy", label: "Biopsy" },
      { id: "surgery-referral", label: "Surgical referral" },
    ],
  },
};

export type SpecialtyFormMode = "consultation" | "treatment";
export const defaultDentalSpecialty = "general";
export const maxSpecialtyFieldLength = 1000;

export function getDentalSpecialty(id: string) {
  return Object.hasOwn(dentalSpecialties, id) ? dentalSpecialties[id] : undefined;
}

export function specialtyFields(template: SpecialtyTemplate, mode: SpecialtyFormMode) {
  return mode === "consultation" ? template.findings : template.planning;
}

export function procedureLabel(specialty: string, procedure: string) {
  return getDentalSpecialty(specialty)?.options.find(({ id }) => id === procedure)?.label ?? procedure;
}
