import { ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import type { Doctor } from "../types";

export function DoctorTable({ doctors }: { doctors: Doctor[] }) {
  const queryClient = useQueryClient();
  const remember = (doctor: Doctor) => queryClient.setQueryData(queryKeys.admin.doctors.detail(doctor.id), doctor);
  return <div className="admin-doctor-table"><div className="admin-doctor-table-header" aria-hidden="true"><span>医生</span><span>状态</span><span>患者</span><span>问诊</span><span>报告</span><span>最近问诊</span><span /></div><div className="divide-y divide-border">{doctors.map((doctor) => <article className="admin-doctor-list-row" key={doctor.id}><div className="admin-doctor-identity"><div className="avatar">{(doctor.realName || doctor.username).slice(0,1)}</div><div className="min-w-0"><Link to={`/admin/doctors/${doctor.id}`} onClick={() => remember(doctor)}>{doctor.realName || doctor.username}</Link><p>@{doctor.username} · {doctor.role === "doctor" ? "医生" : doctor.role}</p></div></div><div className="admin-doctor-list-status"><span>账号状态</span><Badge tone={doctor.isActive ? "success" : "neutral"}>{doctor.isActive ? "已启用" : "已停用"}</Badge></div><div className="admin-doctor-number"><span>患者</span><strong>{doctor.patientCount}</strong></div><div className="admin-doctor-number"><span>问诊</span><strong>{doctor.consultationCount}</strong></div><div className="admin-doctor-number"><span>报告</span><strong>{doctor.aiReportCount}</strong></div><div className="admin-doctor-last"><span>最近问诊</span><strong>{formatDateTime(doctor.lastConsultationTime)}</strong></div><Button asChild variant="ghost" size="icon"><Link to={`/admin/doctors/${doctor.id}`} aria-label={`查看${doctor.realName || doctor.username}详情`} onClick={() => remember(doctor)}><ArrowRight className="h-4 w-4" /></Link></Button></article>)}</div></div>;
}
