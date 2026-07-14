import { ShieldCheck } from "lucide-react";
import type { Doctor } from "../types";
import { DoctorProfileForm } from "./doctor-profile-form";
import { DoctorStatusControl } from "./doctor-status-control";
import { ResetDoctorPassword } from "./reset-doctor-password";

export function DoctorSecurityPanel({ doctor }: { doctor: Doctor }) {
  return <section aria-labelledby="doctor-security-title"><div className="doctor-security-title"><ShieldCheck className="h-5 w-5" /><div><h2 id="doctor-security-title">账号安全管理</h2><p>仅管理医生资料、登录状态和密码，不改变角色或权限。</p></div></div><div className="doctor-security-layout"><DoctorProfileForm doctor={doctor} /><div className="space-y-5"><DoctorStatusControl doctor={doctor} /><ResetDoctorPassword doctor={doctor} /></div></div></section>;
}
