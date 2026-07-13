import { ArrowRight, BrainCircuit, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { DoctorDashboardConsultation } from "@/types/api";

export function PendingConsultationSection({ consultations }: { consultations: DoctorDashboardConsultation[] }) {
  const pending = consultations.filter((item) => !item.hasAiReport);
  return <section className="workspace-section dashboard-priority-section" aria-labelledby="pending-consultations-title">
    <div className="section-heading"><div><h2 id="pending-consultations-title">近期待处理问诊</h2><p>仅显示最近问诊中需要 AI 分析的记录</p></div><Badge tone={pending.length ? "warning" : "success"}>{pending.length ? `${pending.length} 条待分析` : "近期已处理"}</Badge></div>
    {pending.length ? <div className="divide-y divide-border">{pending.map((item) => <article className="dashboard-pending-row" key={item.consultationId}><div className="row-icon"><BrainCircuit /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{item.patientName}</strong><Badge tone="warning">需要 AI 分析</Badge></div><p>{item.chiefComplaint || "主诉未记录"}</p><span>{formatDateTime(item.createdAt)} · 问诊 #{item.consultationId}</span></div><Button asChild size="sm"><Link to={`/doctor/patients/${item.patientId}/consultations/${item.consultationId}/diagnosis`}>进入分析<ArrowRight className="h-4 w-4" /></Link></Button></article>)}</div> : <div className="dashboard-complete-state"><CheckCircle2 className="h-6 w-6 text-success" /><div><strong>近期问诊均已有 AI 报告</strong><p>最近返回的问诊中没有需要 AI 分析的记录。</p></div></div>}
  </section>;
}
