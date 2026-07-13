import { BrainCircuit, CalendarDays, Users } from "lucide-react";
import { Metric } from "@/components/ui/metric";
import type { DoctorDashboard } from "@/types/api";

function metricValue(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : "暂无";
}

export function DashboardSummary({ dashboard }: { dashboard: DoctorDashboard }) {
  return <section className="dashboard-summary" aria-label="工作摘要">
    <Metric label="今日问诊" value={metricValue(dashboard.todayConsultationCount)} detail="今日已记录问诊" icon={CalendarDays} />
    <Metric label="患者总数" value={metricValue(dashboard.patientCount)} detail="当前归属患者" icon={Users} />
    <Metric label="AI 报告" value={metricValue(dashboard.aiReportCount)} detail="已生成辅助报告" icon={BrainCircuit} />
  </section>;
}
