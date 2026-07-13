import { apiRequest } from "./client";
import type { Doctor, DoctorPatient } from "@/features/admin/doctors/types";

interface DoctorDto {
  医生ID: number;
  用户名: string;
  医生姓名: string | null;
  角色: string;
  是否启用: boolean;
  患者数量: number;
  问诊次数: number;
  报告数量: number;
  最近问诊时间: string | null;
}

interface DoctorPatientDto {
  患者ID: number;
  姓名: string;
  性别: string | null;
  年龄: number | null;
  电话: string | null;
  问诊次数: number;
  最近问诊时间: string | null;
}

function mapDoctor(item: DoctorDto): Doctor {
  return { id: item.医生ID, username: item.用户名, realName: item.医生姓名, role: item.角色, isActive: item.是否启用, patientCount: item.患者数量, consultationCount: item.问诊次数, aiReportCount: item.报告数量, lastConsultationTime: item.最近问诊时间 };
}

function mapDoctorPatient(item: DoctorPatientDto): DoctorPatient {
  return { id: item.患者ID, name: item.姓名, gender: item.性别, age: item.年龄, phone: item.电话, consultationCount: item.问诊次数, lastConsultationTime: item.最近问诊时间 };
}

export async function getAdminDoctors(keyword = ""): Promise<Doctor[]> {
  const params = new URLSearchParams({ sort_by: "consultation_count", sort_order: "desc" });
  if (keyword.trim()) params.set("keyword", keyword.trim());
  const data = await apiRequest<DoctorDto[]>(`/admin/doctors/stats?${params.toString()}`);
  return data.map(mapDoctor);
}

export async function getAdminDoctorPatients(doctorId: number): Promise<DoctorPatient[]> {
  const data = await apiRequest<DoctorPatientDto[]>(`/admin/doctors/${doctorId}/patients`);
  return data.map(mapDoctorPatient);
}
