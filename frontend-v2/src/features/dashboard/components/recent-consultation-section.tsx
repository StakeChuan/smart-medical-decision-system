import { ArrowRight, BrainCircuit, FileText, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { DoctorDashboardConsultation } from "@/types/api";

export function RecentConsultationSection({ consultations }: { consultations: DoctorDashboardConsultation[] }) {
  return <section className="workspace-section" aria-labelledby="recent-consultations-title"><div className="section-heading"><div><h2 id="recent-consultations-title">最近问诊</h2><p>按问诊时间由近到远</p></div><Button asChild variant="ghost" size="sm"><Link to="/doctor/patients">查看患者</Link></Button></div>
    {consultations.length ? <div className="divide-y divide-border">{consultations.map((item) => { const destination = item.hasAiReport ? `/doctor/patients/${item.patientId}/consultations/${item.consultationId}/report` : `/doctor/patients/${item.patientId}/consultations/${item.consultationId}/diagnosis`; return <article className="dashboard-consultation-row" key={item.consultationId}><div className="row-icon"><Stethoscope /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{item.patientName}</strong><Badge tone={item.hasAiReport ? "success" : "warning"}>{item.hasAiReport ? "报告已生成" : "待 AI 分析"}</Badge></div><p>{item.chiefComplaint || "主诉未记录"}</p></div><span className="dashboard-row-time">{formatDateTime(item.createdAt)}</span><Button asChild variant="ghost" size="icon" aria-label={`${item.hasAiReport ? "查看报告" : "进入AI分析"}：${item.patientName}`}><Link to={destination}>{item.hasAiReport ? <FileText className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}<ArrowRight className="sr-only" /></Link></Button></article>; })}</div> : <EmptyState title="暂无问诊记录" description="完成首次问诊后，最近问诊会显示在这里。" />}
  </section>;
}
