import { apiRequest } from "./client";
import type { AdminDashboard, AdminDoctorOverview, AdminPatientOverview, ConsultationTrendPoint } from "@/features/admin/types";

interface AdminDoctorDto {
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

interface AdminPatientDto {
  患者ID: number;
  姓名: string;
  医生姓名: string;
  创建时间: string | null;
  问诊次数: number | null;
  最近问诊时间: string | null;
}

interface AdminDashboardDto {
  医生总数: number;
  患者总数: number;
  问诊总数: number;
  报告总数: number;
  今日问诊数: number;
  近7天问诊趋势: Array<{ 日期: string; 问诊数量: number }>;
  医生排行: AdminDoctorDto[];
  最近新增患者: AdminPatientDto[];
  活跃患者: AdminPatientDto[];
}

const numberOrZero = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

function mapDoctor(item: AdminDoctorDto): AdminDoctorOverview {
  return { doctorId: item.医生ID, username: item.用户名, realName: item.医生姓名, role: item.角色, isActive: item.是否启用, patientCount: numberOrZero(item.患者数量), consultationCount: numberOrZero(item.问诊次数), aiReportCount: numberOrZero(item.报告数量), lastConsultationTime: item.最近问诊时间 };
}

function mapPatient(item: AdminPatientDto): AdminPatientOverview {
  return { patientId: item.患者ID, name: item.姓名, doctorName: item.医生姓名, createdAt: item.创建时间, consultationCount: typeof item.问诊次数 === "number" ? item.问诊次数 : null, lastConsultationTime: item.最近问诊时间 };
}

function mapTrend(item: { 日期: string; 问诊数量: number }): ConsultationTrendPoint {
  return { date: item.日期, consultationCount: numberOrZero(item.问诊数量) };
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const data = await apiRequest<AdminDashboardDto>("/admin/dashboard");
  return {
    summary: { doctorCount: numberOrZero(data.医生总数), patientCount: numberOrZero(data.患者总数), consultationCount: numberOrZero(data.问诊总数), aiReportCount: numberOrZero(data.报告总数), todayConsultationCount: numberOrZero(data.今日问诊数) },
    consultationTrend: (data.近7天问诊趋势 ?? []).map(mapTrend),
    topDoctors: (data.医生排行 ?? []).map(mapDoctor),
    recentPatients: (data.最近新增患者 ?? []).map(mapPatient),
    activePatients: (data.活跃患者 ?? []).map(mapPatient),
  };
}
