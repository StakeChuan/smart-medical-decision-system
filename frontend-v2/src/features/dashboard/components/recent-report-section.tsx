import { ArrowRight, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { DoctorDashboardConsultation } from "@/types/api";

export function RecentReportSection({ consultations }: { consultations: DoctorDashboardConsultation[] }) {
  const reports = consultations.filter((item) => item.hasAiReport);
  return <section className="workspace-section" aria-labelledby="recent-reports-title"><div className="section-heading"><div><h2 id="recent-reports-title">最近 AI 报告</h2><p>范围为最近问诊中已生成的报告</p></div></div>
    {reports.length ? <div className="divide-y divide-border">{reports.map((item) => <Link className="dashboard-report-row" to={`/doctor/patients/${item.patientId}/consultations/${item.consultationId}/report`} key={item.consultationId}><div className="dashboard-report-icon"><FileCheck2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><strong>{item.patientName}</strong><p>问诊 #{item.consultationId}</p></div><div className="dashboard-report-time"><span>问诊时间</span><strong>{formatDateTime(item.createdAt)}</strong></div><ArrowRight className="h-4 w-4 shrink-0 text-muted" /></Link>)}</div> : <EmptyState title="暂无最近 AI 报告" description="最近返回的问诊中尚无已生成报告。" />}
  </section>;
}
