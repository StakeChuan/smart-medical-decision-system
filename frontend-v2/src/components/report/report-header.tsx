import { ArrowLeft, FileCheck2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { Consultation } from "@/types/consultation";
import type { Patient } from "@/types/patient";

export function ReportHeader({ patient, consultation }: { patient: Patient; consultation: Consultation }) {
  return <header className="report-header">
    <Button asChild variant="ghost" size="sm" className="print-hidden mb-4 px-0"><Link to={`/doctor/patients/${patient.id}`}><ArrowLeft className="h-4 w-4" />返回患者详情</Link></Button>
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><div className="flex flex-wrap items-center gap-2"><div className="report-title-icon"><FileCheck2 className="h-5 w-5" /></div><h1>AI 辅助决策报告</h1><Badge tone="success">已生成</Badge></div><p>问诊 #{consultation.id} · {formatDateTime(consultation.createdAt)}</p></div>
      <div className="flex items-center gap-3 border-l border-border pl-4"><UserRound className="h-5 w-5 text-primary" /><div><strong className="block text-sm">{patient.name || "未命名患者"}</strong><span className="text-xs text-muted">{[patient.gender, patient.age == null ? null : `${patient.age} 岁`].filter(Boolean).join(" · ") || "基本资料待完善"} · 患者 #{patient.id}</span></div></div>
    </div>
  </header>;
}
