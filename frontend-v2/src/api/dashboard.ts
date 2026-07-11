import { apiRequest } from "./client";
import type { DoctorDashboard } from "@/types/api";

interface DashboardResponse {
  患者总数: number;
  问诊总数: number;
  AI报告总数: number;
  今日问诊数: number;
  最近患者: Array<Record<string, unknown>>;
  最近问诊: Array<Record<string, unknown>>;
}

export async function getDoctorDashboard(): Promise<DoctorDashboard> {
  const data = await apiRequest<DashboardResponse>("/doctor/dashboard");
  return {
    patientCount: data.患者总数,
    consultationCount: data.问诊总数,
    aiReportCount: data.AI报告总数,
    todayConsultationCount: data.今日问诊数,
    recentPatients: data.最近患者.map((item) => ({
      patientId: Number(item.患者ID), name: String(item.姓名 ?? "未命名患者"),
      gender: item.性别 ? String(item.性别) : null, age: item.年龄 == null ? null : Number(item.年龄),
      phone: item.电话 ? String(item.电话) : null, createdAt: item.创建时间 ? String(item.创建时间) : null,
      consultationCount: Number(item.问诊次数 ?? 0), lastConsultationTime: item.最近问诊时间 ? String(item.最近问诊时间) : null,
    })),
    recentConsultations: data.最近问诊.map((item) => ({
      consultationId: Number(item.问诊ID), patientId: Number(item.患者ID),
      patientName: String(item.患者姓名 ?? "未命名患者"), chiefComplaint: item.主诉 ? String(item.主诉) : null,
      hasAiReport: Boolean(item.是否生成AI报告), createdAt: item.创建时间 ? String(item.创建时间) : null,
    })),
  };
}
