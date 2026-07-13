import { Badge } from "@/components/ui/badge";
import type { Doctor } from "../types";

export function DoctorDetail({ doctor }: { doctor: Doctor }) {
  const fields = [
    ["医生姓名", doctor.realName || "暂未提供"], ["用户名", doctor.username],
    ["角色", doctor.role === "doctor" ? "医生" : doctor.role], ["创建时间", "暂未提供"],
  ];
  return <section className="workspace-section"><div className="section-heading"><div><h2>基础信息</h2><p>来自医生统计接口，未提供字段不做推断</p></div><Badge tone={doctor.isActive ? "success" : "neutral"}>{doctor.isActive ? "账号已启用" : "账号已停用"}</Badge></div><div className="admin-doctor-detail-fields">{fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}
