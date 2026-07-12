export const queryKeys = {
  patients: {
    all: ["patients"] as const,
    detail: (patientId: number) => ["patients", patientId] as const,
    consultations: (patientId: number) => ["patients", patientId, "consultations"] as const,
  },
  consultations: {
    detail: (patientId: number, consultationId: number) =>
      ["patients", patientId, "consultations", consultationId] as const,
  },
  reports: {
    detail: (patientId: number, consultationId: number) =>
      ["patients", patientId, "consultations", consultationId, "report"] as const,
    generate: (patientId: number, consultationId: number) =>
      ["patients", patientId, "consultations", consultationId, "report", "generate"] as const,
  },
} as const;

export function isValidEntityId(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
