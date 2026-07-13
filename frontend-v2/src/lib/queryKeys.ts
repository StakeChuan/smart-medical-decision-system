export const queryKeys = {
  admin: {
    dashboard: ["admin", "dashboard"] as const,
    doctors: {
      list: (keyword = "") => ["admin", "doctors", "list", keyword] as const,
      detail: (doctorId: number) => ["admin", "doctors", doctorId] as const,
      patients: (doctorId: number) => ["admin", "doctors", doctorId, "patients"] as const,
    },
    patients: {
      list: (doctorId: number | null = null) => ["admin", "patients", "list", doctorId ?? "all"] as const,
      detail: (patientId: number) => ["admin", "patients", patientId] as const,
      consultations: (patientId: number) => ["admin", "patients", patientId, "consultations"] as const,
    },
  },
  dashboard: {
    doctor: ["dashboard", "doctor"] as const,
  },
  patients: {
    all: ["patients"] as const,
    create: ["patients", "create"] as const,
    detail: (patientId: number) => ["patients", patientId] as const,
    consultations: (patientId: number) => ["patients", patientId, "consultations"] as const,
  },
  consultations: {
    create: ["consultations", "create"] as const,
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
