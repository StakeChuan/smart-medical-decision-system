import { EmptyState } from "@/components/ui/states";
import type { Consultation } from "@/types/consultation";
import { ConsultationHistoryItem } from "./consultation-history-item";

export function MedicalTimeline({ consultations }: { consultations: Consultation[] }) {
  return <section className="workspace-section" aria-labelledby="medical-timeline-title">
    <div className="section-heading"><div><h2 id="medical-timeline-title">医疗时间线</h2><p>按时间查看问诊记录与 AI 报告状态</p></div><span className="text-xs text-muted">共 {consultations.length} 条</span></div>
    {consultations.length ? <div className="medical-timeline">{consultations.map((consultation) => <ConsultationHistoryItem consultation={consultation} key={consultation.id} />)}</div> : <EmptyState title="暂无历史问诊" description="该患者尚未建立问诊记录。" />}
  </section>;
}
