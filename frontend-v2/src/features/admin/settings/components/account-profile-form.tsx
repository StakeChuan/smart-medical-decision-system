import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { useUpdateAdminProfile } from "../mutations";
import type { AdminAccount } from "../types";

const schema = z.object({ realName: z.string().trim().max(50, "姓名不能超过 50 个字符") });
type FormValues = z.infer<typeof schema>;

export function AccountProfileForm({ account }: { account: AdminAccount }) {
  const { user, setSession } = useAuth();
  const mutation = useUpdateAdminProfile();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { realName: account.realName ?? "" },
  });

  useEffect(() => reset({ realName: account.realName ?? "" }), [account.realName, reset]);

  async function submit(values: FormValues) {
    mutation.reset();
    setSaved(false);
    try {
      const next = await mutation.submit({ realName: values.realName || null });
      if (user) setSession({ ...user, realName: next.realName });
      reset({ realName: next.realName ?? "" });
      setSaved(true);
    } catch { /* Mutation state is rendered below. */ }
  }

  return <section className="admin-settings-panel">
    <div className="admin-settings-panel-heading"><UserRound className="h-5 w-5" /><div><h2>管理员资料</h2><p>账号标识和角色由系统维护，当前仅支持修改显示姓名。</p></div></div>
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="admin-settings-fields">
        <label><div><span>用户名</span><p>登录账号，不可在此页面修改。</p></div><Input value={account.username} disabled aria-label="用户名" /></label>
        <label><div><span>真实姓名</span><p>显示在管理员工作区和操作界面。</p></div><div><Input aria-label="真实姓名" maxLength={50} aria-invalid={Boolean(errors.realName)} {...register("realName")} />{errors.realName && <span className="field-error">{errors.realName.message}</span>}</div></label>
        <div className="admin-settings-readonly"><div><span>角色</span><p>当前后端只支持固定角色判断。</p></div><strong>{account.role === "admin" ? "管理员" : account.role}</strong></div>
        <div className="admin-settings-readonly"><div><span>账号状态</span><p>当前登录账号的实时启用状态。</p></div><strong className={account.isActive ? "text-success" : "text-danger"}>{account.isActive ? "已启用" : "已禁用"}</strong></div>
      </div>
      {mutation.error && <div className="admin-settings-error" role="alert">{mutation.error.message}</div>}
      {saved && <div className="admin-settings-success" role="status"><CheckCircle2 className="h-4 w-4" />管理员资料已保存</div>}
      <div className="admin-settings-actions"><Button type="submit" disabled={!isDirty || mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="h-4 w-4 animate-spin" />正在保存</> : "保存资料"}</Button></div>
    </form>
  </section>;
}
