import { ArrowRight, BrainCircuit, FileText, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { Consultation } from "@/types/consultation";
import { ReportStatus } from "./report-status";

function ClinicalValue({ label, value }: { label: string; value: string | null }) {
  return <div><span className="clinical-label">{label}</span><p className={value ? "clinical-value" : "clinical-value text-muted"}>{value || "未记录"}</p></div>;
}

export function ConsultationHistoryItem({ consultation }: { consultation: Consultation }) {
  const destination = `/doctor/patients/${consultation.patientId}/consultations/${consultation.id}/diagnosis`;
  return <article className="consultation-item">
    <div className="timeline-marker"><Stethoscope className="h-4 w-4" /></div>
    <div className="min-w-0 flex-1">
      <div className="consultation-heading">
        <div><p className="text-xs text-muted">{formatDateTime(consultation.createdAt)}</p><h3 className="mt-1 font-semibold">问诊 #{consultation.id}</h3></div>
        <ReportStatus report={consultation.aiReport} />
      </div>
      <div className="consultation-summary">
        <ClinicalValue label="主诉" value={consultation.chiefComplaint} />
        <ClinicalValue label="症状" value={consultation.symptoms} />
        <ClinicalValue label="检查结果" value={consultation.examination} />
      </div>
      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <Button asChild variant={consultation.aiReport ? "secondary" : "primary"} size="sm">
          <Link to={destination}>{consultation.aiReport ? <FileText className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}{consultation.aiReport ? "查看 AI 报告" : "进入 AI 诊断"}<ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  </article>;
}
