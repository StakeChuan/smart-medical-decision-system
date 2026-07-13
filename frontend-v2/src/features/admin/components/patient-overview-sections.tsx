import { Activity, UserRoundPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { AdminPatientOverview } from "../types";

function PatientRows({ patients, mode }: { patients: AdminPatientOverview[]; mode: "recent" | "active" }) {
  if (!patients.length) return <EmptyState title={mode === "recent" ? "暂无新增患者" : "暂无活跃患者"} description="当前接口没有返回对应患者记录。" />;
  return <div className="divide-y divide-border">{patients.map((patient) => <article className="admin-patient-row" key={patient.patientId}><div className="avatar">{patient.name.slice(0,1)}</div><div className="min-w-0"><strong>{patient.name}</strong><p>患者 #{patient.patientId} · 所属医生 {patient.doctorName || "未分配"}</p></div><div className="admin-row-time"><span>{mode === "recent" ? "创建时间" : "最近问诊"}</span><strong>{formatDateTime(mode === "recent" ? patient.createdAt : patient.lastConsultationTime)}</strong>{mode === "active" && <small>问诊 {patient.consultationCount ?? "暂未提供"} 次</small>}</div></article>)}</div>;
}

export function RecentPatientSection({ patients }: { patients: AdminPatientOverview[] }) {
  return <section className="workspace-section"><div className="section-heading"><div><h2>最近新增患者</h2><p>最近 5 条真实建档记录</p></div><UserRoundPlus className="h-4 w-4 text-primary" /></div><PatientRows patients={patients} mode="recent" /></section>;
}

export function ActivePatientSection({ patients }: { patients: AdminPatientOverview[] }) {
  return <section className="workspace-section"><div className="section-heading"><div><h2>最近活跃患者</h2><p>按最近问诊时间与问诊次数展示</p></div><Activity className="h-4 w-4 text-primary" /></div><PatientRows patients={patients} mode="active" /></section>;
}
