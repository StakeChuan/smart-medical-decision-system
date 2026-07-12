import { AlertCircle, History, MapPin, Phone } from "lucide-react";
import type { Patient } from "@/types/patient";

function ProfileField({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string | null }) {
  return <div className="profile-field"><Icon className="h-4 w-4 text-muted" /><div><span>{label}</span><p className={value ? "" : "text-muted"}>{value || "未记录"}</p></div></div>;
}

export function PatientProfileSummary({ patient }: { patient: Patient }) {
  return <section className="workspace-section" aria-labelledby="patient-profile-title">
    <div className="section-heading"><div><h2 id="patient-profile-title">患者资料</h2><p>身份信息与既往健康记录</p></div></div>
    <div className="profile-grid">
      <ProfileField icon={Phone} label="联系电话" value={patient.phone} />
      <ProfileField icon={MapPin} label="联系地址" value={patient.address} />
      <ProfileField icon={History} label="既往病史" value={patient.medicalHistory} />
      <ProfileField icon={AlertCircle} label="过敏史" value={patient.allergyHistory} />
    </div>
  </section>;
}
