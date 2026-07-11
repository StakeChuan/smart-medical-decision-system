export type UserRole = "doctor" | "admin";

export interface User {
  id: number;
  username: string;
  realName: string | null;
  role: UserRole;
  isActive: boolean;
  token: string;
}

export interface DoctorDashboardPatient {
  patientId: number;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  createdAt: string | null;
  consultationCount: number;
  lastConsultationTime: string | null;
}

export interface DoctorDashboardConsultation {
  consultationId: number;
  patientId: number;
  patientName: string;
  chiefComplaint: string | null;
  hasAiReport: boolean;
  createdAt: string | null;
}

export interface DoctorDashboard {
  patientCount: number;
  consultationCount: number;
  aiReportCount: number;
  todayConsultationCount: number;
  recentPatients: DoctorDashboardPatient[];
  recentConsultations: DoctorDashboardConsultation[];
}
