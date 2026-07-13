import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BrainCircuit, Check, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { loginRequest } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingLabel } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";

const schema = z.object({ username: z.string().trim().min(1, "请输入用户名"), password: z.string().min(1, "请输入密码") });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { user, setSession } = useAuth(); const navigate = useNavigate(); const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  if (user) return <Navigate to={user.role === "doctor" ? "/doctor/dashboard" : "/admin/dashboard"} replace />;
  const submit = async (values: FormValues) => { setServerError(""); try { const session = await loginRequest(values.username, values.password); setSession(session); navigate(session.role === "admin" ? "/admin/dashboard" : "/doctor/dashboard"); } catch (error) { setServerError(error instanceof Error ? error.message : "登录失败"); } };

  return <main className="login-page"><section className="login-story"><div className="relative z-10 max-w-xl"><div className="mb-14 inline-flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-sm bg-[#4fb89b] font-bold text-white">医</div><div><strong className="block text-white">智慧医疗辅助决策系统</strong><span className="text-xs text-slate-400">Clinical AI Workspace</span></div></div><p className="mb-4 text-sm font-semibold text-[#75d3b8]">为临床判断提供更清晰的上下文</p><h1 className="max-w-lg text-4xl font-semibold leading-[1.2] text-white">让每一次问诊，都拥有结构化的 AI 辅助分析。</h1><p className="mt-5 max-w-lg text-base leading-7 text-slate-300">围绕患者、问诊和医学依据组织信息，帮助医生更快识别风险并完成可追溯的决策记录。</p><div className="mt-12 grid gap-4 text-sm text-slate-300 sm:grid-cols-2"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#75d3b8]"/>结构化临床摘要</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#75d3b8]"/>风险与紧急程度</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#75d3b8]"/>医学依据追溯</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#75d3b8]"/>医生最终审核</span></div></div><div className="story-lines" /></section>
    <section className="login-form-area"><div className="w-full max-w-[420px]"><div className="mb-9"><div className="mb-5 grid h-11 w-11 place-items-center rounded-sm bg-primary/10 text-primary lg:hidden"><BrainCircuit /></div><h2 className="text-[28px] font-semibold">欢迎回来</h2><p className="mt-2 text-sm text-muted">登录系统工作区，根据账号角色进入对应功能。</p></div><form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate><label className="block"><span className="mb-2 block text-sm font-medium">用户名</span><Input autoComplete="username" placeholder="请输入用户名" aria-invalid={Boolean(errors.username)} {...register("username")} />{errors.username && <span className="mt-1.5 block text-xs text-danger">{errors.username.message}</span>}</label><label className="block"><span className="mb-2 block text-sm font-medium">密码</span><Input type="password" autoComplete="current-password" placeholder="请输入密码" aria-invalid={Boolean(errors.password)} {...register("password")} />{errors.password && <span className="mt-1.5 block text-xs text-danger">{errors.password.message}</span>}</label>{serverError && <div role="alert" className="border-l-2 border-danger bg-danger/5 px-3 py-2.5 text-sm text-danger">{serverError}</div>}<Button className="w-full" disabled={isSubmitting}>{isSubmitting ? <LoadingLabel>正在验证</LoadingLabel> : <>登录系统工作区<ArrowRight className="h-4 w-4"/></>}</Button></form><div className="mt-8 flex items-start gap-3 border-t border-border pt-6"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success"/><p className="text-xs leading-5 text-muted">医生与管理员使用独立工作区，系统按照账号角色控制数据访问权限。</p></div><div className="mt-10 flex items-center gap-2 text-xs text-muted"><Sparkles className="h-3.5 w-3.5"/>企业级智慧医疗工作区</div></div></section></main>;
}
