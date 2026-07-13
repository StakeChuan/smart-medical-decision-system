import { BrainCircuit, CalendarClock, ClipboardList, Stethoscope, Users } from "lucide-react";
import type { AdminSummary } from "../types";

const metrics = [
  { key: "doctorCount", label: "医生数量", icon: Stethoscope },
  { key: "patientCount", label: "患者数量", icon: Users },
  { key: "consultationCount", label: "问诊数量", icon: ClipboardList },
  { key: "aiReportCount", label: "AI 报告数量", icon: BrainCircuit },
  { key: "todayConsultationCount", label: "今日问诊数量", icon: CalendarClock },
] as const;

export function SystemSummary({ summary }: { summary: AdminSummary }) {
  return <section className="admin-summary" aria-label="系统统计">{metrics.map(({ key, label, icon: Icon }) => <div key={key}><div><span>{label}</span><Icon className="h-4 w-4" /></div><strong>{Number.isFinite(summary[key]) ? summary[key] : "暂无数据"}</strong></div>)}</section>;
}
