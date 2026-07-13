export interface Doctor {
  id: number;
  username: string;
  realName: string | null;
  role: string;
  isActive: boolean;
  patientCount: number;
  consultationCount: number;
  aiReportCount: number;
  lastConsultationTime: string | null;
}

export interface DoctorPatient {
  id: number;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  consultationCount: number;
  lastConsultationTime: string | null;
}
