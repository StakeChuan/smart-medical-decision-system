import { Badge } from "@/components/ui/badge";
import type { Doctor } from "@/features/admin/doctors/types";
import { formatDateTime } from "@/lib/utils";
import type { AdminPatient } from "../types";

function value(value: string | number | null) { return value == null || value === "" ? "暂未提供" : String(value); }

export function PatientDetail({ patient, doctor }: { patient: AdminPatient; doctor?: Doctor }) {
  const fields = [["患者姓名", patient.name], ["患者 ID", patient.id], ["性别", value(patient.gender)], ["年龄", patient.age == null ? "暂未提供" : `${patient.age} 岁`], ["联系方式", value(patient.phone)], ["地址", value(patient.address)], ["所属医生", patient.doctorId == null ? "暂未分配" : doctor ? doctor.realName || doctor.username : `医生 #${patient.doctorId}`], ["建档时间", formatDateTime(patient.createdAt)]];
  return <section className="workspace-section"><div className="section-heading"><div><h2>基础信息</h2><p>来自患者详情接口，缺失字段不做推断</p></div><Badge tone={patient.doctorId == null ? "neutral" : "success"}>{patient.doctorId == null ? "暂未分配医生" : "已分配医生"}</Badge></div><div className="admin-patient-detail-fields">{fields.map(([label, fieldValue]) => <div key={label}><span>{label}</span><strong>{fieldValue}</strong></div>)}</div></section>;
}
