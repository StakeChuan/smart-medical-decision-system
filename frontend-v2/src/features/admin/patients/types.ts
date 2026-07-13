export interface AdminPatient {
  id: number;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  address: string | null;
  doctorId: number | null;
  medicalHistory: string | null;
  allergyHistory: string | null;
  createdAt: string;
}

export interface AdminPatientConsultation {
  id: number;
  patientId: number;
  doctorId: number | null;
  chiefComplaint: string | null;
  createdAt: string;
  hasAiReport: boolean;
}

export interface AdminPatientClinicalOverview {
  consultationCount: number;
  aiReportCount: number;
  lastConsultationTime: string | null;
}
