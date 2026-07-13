export interface AdminSummary {
  doctorCount: number;
  patientCount: number;
  consultationCount: number;
  aiReportCount: number;
  todayConsultationCount: number;
}

export interface ConsultationTrendPoint {
  date: string;
  consultationCount: number;
}

export interface AdminDoctorOverview {
  doctorId: number;
  username: string;
  realName: string | null;
  role: string;
  isActive: boolean;
  patientCount: number;
  consultationCount: number;
  aiReportCount: number;
  lastConsultationTime: string | null;
}

export interface AdminPatientOverview {
  patientId: number;
  name: string;
  doctorName: string;
  createdAt: string | null;
  consultationCount: number | null;
  lastConsultationTime: string | null;
}

export interface AdminDashboard {
  summary: AdminSummary;
  consultationTrend: ConsultationTrendPoint[];
  topDoctors: AdminDoctorOverview[];
  recentPatients: AdminPatientOverview[];
  activePatients: AdminPatientOverview[];
}
