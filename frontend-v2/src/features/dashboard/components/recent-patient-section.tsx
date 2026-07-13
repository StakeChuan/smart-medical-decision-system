import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { DoctorDashboardPatient } from "@/types/api";

export function RecentPatientSection({ patients }: { patients: DoctorDashboardPatient[] }) {
  return <section className="workspace-section" aria-labelledby="recent-patients-title"><div className="section-heading"><div><h2 id="recent-patients-title">最近患者</h2><p>按最近建档排序</p></div><Link className="dashboard-section-link" to="/doctor/patients">查看全部</Link></div>
    {patients.length ? <div className="divide-y divide-border">{patients.map((patient) => <Link to={`/doctor/patients/${patient.patientId}`} className="dashboard-patient-row" key={patient.patientId}><div className="avatar">{patient.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><strong>{patient.name}</strong><p>{[patient.gender, patient.age == null ? null : `${patient.age} 岁`, `患者 #${patient.patientId}`].filter(Boolean).join(" · ") || `患者 #${patient.patientId}`}</p></div><div className="dashboard-patient-meta"><span>问诊 {patient.consultationCount} 次</span><span>建档 {formatDateTime(patient.createdAt)}</span></div><ArrowRight className="h-4 w-4 shrink-0 text-muted" /></Link>)}</div> : <EmptyState title="暂无患者" description="新增患者后会显示在这里。" />}
  </section>;
}
