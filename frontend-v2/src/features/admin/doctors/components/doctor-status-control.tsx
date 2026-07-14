import { CheckCircle2, Power, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUpdateDoctorStatus } from "../mutations";
import type { Doctor } from "../types";

export function DoctorStatusControl({ doctor }: { doctor: Doctor }) {
  const mutation = useUpdateDoctorStatus(doctor.id);
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  const nextActive = !doctor.isActive;

  async function confirm() {
    mutation.reset(); setChanged(false);
    try { await mutation.submit({ doctorId: doctor.id, isActive: nextActive }); setOpen(false); setChanged(true); } catch { /* Rendered below. */ }
  }

  return <section className="doctor-security-card"><div className="doctor-security-heading"><Power className="h-5 w-5" /><div><h3>账号状态</h3><p>停用后该医生将无法登录或继续访问受保护接口。</p></div></div><div className="doctor-status-body"><div className={doctor.isActive ? "doctor-status-indicator is-active" : "doctor-status-indicator is-inactive"}><span>{doctor.isActive ? "账号已启用" : "账号已停用"}</span><p>{doctor.isActive ? "医生目前可以正常登录系统。" : "医生当前无法登录系统。"}</p></div><Button variant={doctor.isActive ? "danger" : "primary"} onClick={() => { mutation.reset(); setChanged(false); setOpen(true); }}>{doctor.isActive ? "禁用账号" : "重新启用"}</Button></div>{mutation.error && <div className="doctor-security-error" role="alert">{mutation.error.message}</div>}{changed && <div className="doctor-security-success" role="status"><CheckCircle2 className="h-4 w-4" />账号状态已更新</div>}<div className="doctor-security-note"><ShieldAlert className="h-4 w-4" />状态修改会由后端记录到系统操作日志。</div><ConfirmDialog open={open} onOpenChange={setOpen} title={nextActive ? "确认启用医生账号" : "确认禁用医生账号"} description={nextActive ? `启用后，${doctor.realName || doctor.username} 可以重新登录系统。` : `禁用后，${doctor.realName || doctor.username} 将立即无法通过账号验证。`} confirmLabel={nextActive ? "确认启用" : "确认禁用"} danger={!nextActive} isPending={mutation.isPending} onConfirm={() => void confirm()} /></section>;
}
