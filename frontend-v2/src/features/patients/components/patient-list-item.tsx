import { AlertTriangle, ArrowRight, CalendarDays, ClipboardPlus, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/patient";

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "创建时间未知";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function PatientListItem({ patient }: { patient: Patient }) {
  const demographics = [patient.gender, patient.age == null ? null : `${patient.age} 岁`].filter(Boolean).join(" · ");
  return <article className="patient-list-item">
    <div className="patient-list-identity"><div className="avatar h-10 w-10"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><Link className="patient-name-link" to={`/doctor/patients/${patient.id}`}>{patient.name || "未命名患者"}</Link><p>{demographics || "性别与年龄待完善"}</p><div className="patient-mobile-meta"><span>#{patient.id}</span><span>{patient.allergyHistory ? "有过敏史" : "过敏史未记录"}</span><span>{formatCreatedAt(patient.createdAt)}</span></div></div></div>
    <div className="patient-list-cell"><span>患者编号</span><strong>#{patient.id}</strong></div>
    <div className="patient-list-cell"><span>过敏史</span>{patient.allergyHistory ? <Badge tone="danger"><AlertTriangle className="mr-1 h-3.5 w-3.5" />有记录</Badge> : <Badge tone="neutral">未记录</Badge>}</div>
    <div className="patient-list-cell"><span>创建时间</span><strong className="flex items-center gap-1.5 font-medium"><CalendarDays className="h-3.5 w-3.5 text-muted" />{formatCreatedAt(patient.createdAt)}</strong></div>
    <div className="patient-list-actions"><Button asChild variant="ghost" size="icon" aria-label={`为${patient.name || "患者"}新建问诊`}><Link to={`/doctor/consultations/new?patientId=${patient.id}`}><ClipboardPlus className="h-4 w-4" /></Link></Button><Button asChild variant="ghost" size="icon" aria-label={`查看${patient.name || "患者"}详情`}><Link to={`/doctor/patients/${patient.id}`}><ArrowRight className="h-4 w-4" /></Link></Button></div>
  </article>;
}
