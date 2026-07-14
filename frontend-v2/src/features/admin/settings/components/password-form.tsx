import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { useChangeAdminPassword } from "../mutations";

const schema = z.object({
  oldPassword: z.string().min(1, "请输入当前密码").max(100, "密码不能超过 100 个字符"),
  newPassword: z.string().min(6, "新密码至少需要 6 个字符").max(100, "密码不能超过 100 个字符"),
  confirmPassword: z.string().min(1, "请再次输入新密码"),
}).refine((values) => values.newPassword === values.confirmPassword, { path: ["confirmPassword"], message: "两次输入的新密码不一致" })
  .refine((values) => values.newPassword !== values.oldPassword, { path: ["newPassword"], message: "新密码不能与当前密码相同" });
type FormValues = z.infer<typeof schema>;

export function PasswordForm() {
  const mutation = useChangeAdminPassword();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function submit(values: FormValues) {
    if (!window.confirm("修改密码后将退出当前登录，确定继续吗？")) return;
    mutation.reset();
    try {
      await mutation.submit({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      window.alert("密码修改成功，请使用新密码重新登录。");
      logout();
      navigate("/login", { replace: true });
    } catch { /* Mutation state is rendered below. */ }
  }

  return <section className="admin-settings-panel">
    <div className="admin-settings-panel-heading"><KeyRound className="h-5 w-5" /><div><h2>修改密码</h2><p>提交前需要验证当前密码，修改成功后将退出当前登录。</p></div></div>
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="admin-settings-fields">
        <label><div><span>当前密码</span><p>用于确认本次操作由账号本人发起。</p></div><div><Input aria-label="当前密码" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.oldPassword)} {...register("oldPassword")} />{errors.oldPassword && <span className="field-error">{errors.oldPassword.message}</span>}</div></label>
        <label><div><span>新密码</span><p>至少 6 个字符，最长 100 个字符。</p></div><div><Input aria-label="新密码" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} {...register("newPassword")} />{errors.newPassword && <span className="field-error">{errors.newPassword.message}</span>}</div></label>
        <label><div><span>确认新密码</span><p>再次输入新密码，避免输入错误。</p></div><div><Input aria-label="确认新密码" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...register("confirmPassword")} />{errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}</div></label>
      </div>
      <div className="admin-settings-security-note"><ShieldAlert className="h-4 w-4" /><p>当前后端尚未提供登录设备管理和令牌撤销能力；页面会在修改成功后清除本机登录状态。</p></div>
      {mutation.error && <div className="admin-settings-error" role="alert">{mutation.error.message}</div>}
      <div className="admin-settings-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="h-4 w-4 animate-spin" />正在修改</> : "修改密码"}</Button></div>
    </form>
  </section>;
}
