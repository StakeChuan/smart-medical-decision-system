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

export interface DoctorAccount {
  id: number;
  username: string;
  realName: string | null;
  role: string;
  isActive: boolean;
}

export interface UpdateDoctorInput {
  doctorId: number;
  username: string;
  realName: string | null;
}

export interface UpdateDoctorStatusInput {
  doctorId: number;
  isActive: boolean;
}

export interface ResetDoctorPasswordInput {
  doctorId: number;
  newPassword: string;
}

export interface ResetDoctorPasswordResult {
  doctorId: number;
  message: string;
}
