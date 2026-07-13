import { ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import type { Doctor } from "@/features/admin/doctors/types";
import type { AdminPatient } from "../types";

function doctorLabel(patient: AdminPatient, doctors: Doctor[]) {
  if (patient.doctorId == null) return "暂未分配";
  const doctor = doctors.find((item) => item.id === patient.doctorId);
  return doctor ? doctor.realName || doctor.username : `医生 #${patient.doctorId}`;
}

export function PatientTable({ patients, doctors }: { patients: AdminPatient[]; doctors: Doctor[] }) {
  const queryClient = useQueryClient();
  const remember = (patient: AdminPatient) => queryClient.setQueryData(queryKeys.admin.patients.detail(patient.id), patient);
  return <div className="admin-patient-table"><div className="admin-patient-table-header" aria-hidden="true"><span>患者</span><span>基础信息</span><span>所属医生</span><span>创建时间</span><span>问诊</span><span>最近问诊</span><span /></div><div className="divide-y divide-border">{patients.map((patient) => <article className="admin-patient-list-row" key={patient.id}><div className="admin-patient-identity"><div className="avatar">{patient.name.slice(0,1)}</div><div className="min-w-0"><Link to={`/admin/patients/${patient.id}`} onClick={() => remember(patient)}>{patient.name}</Link><p>患者 #{patient.id}</p></div></div><div className="admin-patient-demographics"><span>基础信息</span><strong>{patient.gender || "性别暂未提供"} · {patient.age == null ? "年龄暂未提供" : `${patient.age} 岁`}</strong></div><div className="admin-patient-owner"><span>所属医生</span><strong>{doctorLabel(patient, doctors)}</strong></div><div className="admin-patient-date"><span>创建时间</span><strong>{formatDateTime(patient.createdAt)}</strong></div><div className="admin-patient-unavailable"><span>问诊</span><strong>暂未提供</strong></div><div className="admin-patient-unavailable"><span>最近问诊</span><strong>暂未提供</strong></div><Button asChild variant="ghost" size="icon"><Link to={`/admin/patients/${patient.id}`} aria-label={`查看${patient.name}详情`} onClick={() => remember(patient)}><ArrowRight className="h-4 w-4" /></Link></Button></article>)}</div></div>;
}
