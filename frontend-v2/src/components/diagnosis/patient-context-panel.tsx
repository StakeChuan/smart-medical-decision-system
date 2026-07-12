import { AlertTriangle, CalendarDays, History, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Patient } from "@/types/patient";

function ContextValue({ label, value }: { label: string; value: string | null }) {
  return <div className="context-value"><span>{label}</span><p className={value ? "" : "text-muted"}>{value || "未记录"}</p></div>;
}

export function PatientContextPanel({ patient }: { patient: Patient }) {
  return <aside className="workspace-section diagnosis-context" aria-labelledby="patient-context-title">
    <div className="section-heading"><div><h2 id="patient-context-title">患者上下文</h2><p>当前分析对应的患者资料</p></div></div>
    <div className="p-5">
      <div className="flex items-center gap-3"><div className="patient-avatar h-11 w-11"><UserRound className="h-5 w-5" /></div><div><strong>{patient.name || "未命名患者"}</strong><p className="mt-1 text-xs text-muted">{[patient.gender, patient.age == null ? null : `${patient.age} 岁`].filter(Boolean).join(" · ") || "基本资料待完善"}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{patient.allergyHistory ? <Badge tone="danger"><AlertTriangle className="mr-1 h-3.5 w-3.5" />有过敏史</Badge> : <Badge>过敏史未记录</Badge>}<Badge>患者 #{patient.id}</Badge></div>
      <div className="mt-5 divide-y divide-border border-t border-border">
        <ContextValue label="既往病史" value={patient.medicalHistory} />
        <ContextValue label="过敏史" value={patient.allergyHistory} />
        <div className="flex items-center gap-2 py-4 text-xs text-muted"><CalendarDays className="h-4 w-4" />建档 {formatDateTime(patient.createdAt)}</div>
      </div>
      <div className="context-notice"><History className="h-4 w-4" /><p>AI 输出仅用于辅助医生审核，不替代临床诊断。</p></div>
    </div>
  </aside>;
}
