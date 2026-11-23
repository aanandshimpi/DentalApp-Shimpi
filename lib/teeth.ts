export const toothCharts = {
  Permanent: [
    { label: "Upper right", teeth: ["18", "17", "16", "15", "14", "13", "12", "11"] },
    { label: "Upper left", teeth: ["21", "22", "23", "24", "25", "26", "27", "28"] },
    { label: "Lower right", teeth: ["48", "47", "46", "45", "44", "43", "42", "41"] },
    { label: "Lower left", teeth: ["31", "32", "33", "34", "35", "36", "37", "38"] },
  ],
  Primary: [
    { label: "Upper right", teeth: ["55", "54", "53", "52", "51"] },
    { label: "Upper left", teeth: ["61", "62", "63", "64", "65"] },
    { label: "Lower right", teeth: ["85", "84", "83", "82", "81"] },
    { label: "Lower left", teeth: ["71", "72", "73", "74", "75"] },
  ],
} as const;

export const toothNumbers = new Set<string>(
  Object.values(toothCharts).flatMap((chart) => [...chart].flatMap(({ teeth }) => [...teeth])),
);

export const maxToothDetailsLength = 2000;

export const toothSurfaces = {
  mesial: "Mesial",
  distal: "Distal",
  facial: "Buccal / labial",
  lingual: "Lingual / palatal",
  biting: "Occlusal / incisal",
} as const;

export type ToothSurface = keyof typeof toothSurfaces;
