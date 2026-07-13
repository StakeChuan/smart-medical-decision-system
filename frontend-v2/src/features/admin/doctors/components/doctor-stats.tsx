import { BrainCircuit, Clock3, ClipboardList, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Doctor } from "../types";

export function DoctorStats({ doctor }: { doctor: Doctor }) {
  const stats = [
    { label: "患者数量", value: doctor.patientCount, icon: Users },
    { label: "问诊数量", value: doctor.consultationCount, icon: ClipboardList },
    { label: "AI 报告数量", value: doctor.aiReportCount, icon: BrainCircuit },
    { label: "最近问诊", value: formatDateTime(doctor.lastConsultationTime), icon: Clock3 },
  ];
  return <section className="admin-doctor-detail-stats" aria-label="医生工作概览">{stats.map(({ label, value, icon: Icon }) => <div key={label}><div><span>{label}</span><Icon className="h-4 w-4" /></div><strong>{value}</strong></div>)}</section>;
}
