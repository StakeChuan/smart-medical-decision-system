import { AlertTriangle, ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { Patient } from "@/types/patient";

export function PatientHeader({ patient, consultationCount }: { patient: Patient; consultationCount: number }) {
  const demographics = [patient.gender, patient.age == null ? null : `${patient.age} 岁`].filter(Boolean);
  return <header className="patient-header">
    <Button asChild variant="ghost" size="sm" className="self-start px-0 sm:hidden">
      <Link to="/doctor/dashboard"><ArrowLeft className="h-4 w-4" />返回工作台</Link>
    </Button>
    <div className="flex min-w-0 items-start gap-4">
      <div className="patient-avatar"><UserRound className="h-6 w-6" /></div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{patient.name || "未命名患者"}</h1>
          {patient.allergyHistory ? <Badge tone="danger"><AlertTriangle className="mr-1 h-3.5 w-3.5" />有过敏史</Badge> : <Badge>过敏史未记录</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted">{demographics.length ? demographics.join(" · ") : "性别与年龄待完善"} · 患者编号 {patient.id}</p>
      </div>
    </div>
    <div className="patient-header-meta">
      <span><CalendarDays className="h-4 w-4" />建档于 {formatDateTime(patient.createdAt)}</span>
      <strong>{consultationCount} 次问诊</strong>
    </div>
  </header>;
}
