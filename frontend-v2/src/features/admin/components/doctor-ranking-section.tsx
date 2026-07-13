import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { AdminDoctorOverview } from "../types";

export function DoctorRankingSection({ doctors }: { doctors: AdminDoctorOverview[] }) {
  return <section className="workspace-section" aria-labelledby="doctor-ranking-title"><div className="section-heading"><div><h2 id="doctor-ranking-title">医生使用概览</h2><p>按后端医生排行展示前 5 名</p></div></div>{doctors.length ? <div className="divide-y divide-border">{doctors.map((doctor, index) => <article className="admin-doctor-row" key={doctor.doctorId}><span className="admin-rank">{index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{doctor.realName || doctor.username}</strong><Badge tone={doctor.isActive ? "success" : "neutral"}>{doctor.isActive ? "已启用" : "已停用"}</Badge></div><p>@{doctor.username} · {doctor.role === "doctor" ? "医生" : doctor.role}</p></div><div className="admin-doctor-stats"><span>患者 <strong>{doctor.patientCount}</strong></span><span>问诊 <strong>{doctor.consultationCount}</strong></span><span>报告 <strong>{doctor.aiReportCount}</strong></span></div><div className="admin-row-time"><span>最近问诊</span><strong>{formatDateTime(doctor.lastConsultationTime)}</strong></div></article>)}</div> : <EmptyState title="暂无医生数据" description="当前接口未返回医生使用统计。" />}</section>;
}
