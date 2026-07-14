import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useResetDoctorPassword } from "../mutations";
import type { Doctor } from "../types";

const schema = z.object({ newPassword: z.string().min(6, "新密码至少需要 6 个字符").max(100, "密码不能超过 100 个字符"), confirmPassword: z.string().min(1, "请再次输入新密码") }).refine((values) => values.newPassword === values.confirmPassword, { path: ["confirmPassword"], message: "两次输入的新密码不一致" });
type FormValues = z.infer<typeof schema>;

export function ResetDoctorPassword({ doctor }: { doctor: Doctor }) {
  const mutation = useResetDoctorPassword(doctor.id);
  const [open, setOpen] = useState(false);
  const [pendingPassword, setPendingPassword] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { newPassword: "", confirmPassword: "" }, resolver: zodResolver(schema) });

  function prepare(values: FormValues) { mutation.reset(); setResetComplete(false); setPendingPassword(values.newPassword); setOpen(true); }
  async function confirm() {
    try { await mutation.submit({ doctorId: doctor.id, newPassword: pendingPassword }); setPendingPassword(""); reset(); setOpen(false); setResetComplete(true); } catch { /* Rendered below. */ }
  }

  return <section className="doctor-security-card"><div className="doctor-security-heading"><KeyRound className="h-5 w-5" /><div><h3>重置医生密码</h3><p>管理员设置新的临时密码，系统不会在成功后回显密码。</p></div></div><form onSubmit={handleSubmit(prepare)} noValidate><div className="doctor-security-fields"><label><span>新密码</span><div><Input aria-label="医生新密码" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} {...register("newPassword")} />{errors.newPassword && <span className="field-error">{errors.newPassword.message}</span>}</div></label><label><span>确认新密码</span><div><Input aria-label="确认医生新密码" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...register("confirmPassword")} />{errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}</div></label></div><div className="doctor-security-note"><ShieldAlert className="h-4 w-4" />密码重置会由后端记录到系统操作日志，请通过安全渠道告知医生。</div>{mutation.error && <div className="doctor-security-error" role="alert">{mutation.error.message}</div>}{resetComplete && <div className="doctor-security-success" role="status"><CheckCircle2 className="h-4 w-4" />医生密码已重置</div>}<div className="doctor-security-actions"><Button type="submit" variant="secondary" disabled={mutation.isPending}>重置密码</Button></div></form><ConfirmDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !mutation.isPending) setPendingPassword(""); }} title="确认重置医生密码" description={`确定为 ${doctor.realName || doctor.username} 重置密码吗？提交后系统不会再次显示本次输入。`} confirmLabel="确认重置" danger isPending={mutation.isPending} onConfirm={() => void confirm()} /></section>;
}
