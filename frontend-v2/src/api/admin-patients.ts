import { apiRequest } from "./client";
import type { AdminPatient, AdminPatientConsultation } from "@/features/admin/patients/types";

interface AdminPatientDto {
  姓名: string;
  性别: string | null;
  年龄: number | null;
  电话: string | null;
  地址: string | null;
  医生ID: number | null;
  既往病史: string | null;
  过敏史: string | null;
  患者ID: number;
  创建时间: string;
}

interface AdminPatientConsultationDto {
  患者ID: number;
  医生ID: number | null;
  主诉: string | null;
  问诊ID: number;
  创建时间: string;
  AI报告: unknown | null;
}

function mapPatient(item: AdminPatientDto): AdminPatient {
  return {
    id: item.患者ID,
    name: item.姓名,
    gender: item.性别,
    age: item.年龄,
    phone: item.电话,
    address: item.地址,
    doctorId: item.医生ID,
    medicalHistory: item.既往病史,
    allergyHistory: item.过敏史,
    createdAt: item.创建时间,
  };
}

function mapConsultation(item: AdminPatientConsultationDto): AdminPatientConsultation {
  return {
    id: item.问诊ID,
    patientId: item.患者ID,
    doctorId: item.医生ID,
    chiefComplaint: item.主诉,
    createdAt: item.创建时间,
    hasAiReport: item.AI报告 != null,
  };
}

export async function getAdminPatients(doctorId: number | null = null): Promise<AdminPatient[]> {
  const query = doctorId == null ? "" : `?doctor_id=${doctorId}`;
  const data = await apiRequest<AdminPatientDto[]>(`/patients${query}`);
  return data.map(mapPatient);
}

export async function getAdminPatient(patientId: number): Promise<AdminPatient> {
  return mapPatient(await apiRequest<AdminPatientDto>(`/patients/${patientId}`));
}

export async function getAdminPatientConsultations(patientId: number): Promise<AdminPatientConsultation[]> {
  const data = await apiRequest<AdminPatientConsultationDto[]>(`/patients/${patientId}/consultations`);
  return data.map(mapConsultation);
}
