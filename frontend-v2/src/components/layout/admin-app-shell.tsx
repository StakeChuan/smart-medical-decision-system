import { Activity, BarChart3, BrainCircuit, ChevronDown, FileClock, LogOut, Menu, Settings, ShieldCheck, Stethoscope, UserRound, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "系统概览", icon: BarChart3, to: "/admin/dashboard", enabled: true },
  { label: "医生管理", icon: Stethoscope, to: "/admin/doctors", enabled: true },
  { label: "患者管理", icon: Users, to: "/admin/patients", enabled: true },
  { label: "AI 管理中心", icon: BrainCircuit, to: "/admin/ai", enabled: true },
  { label: "操作日志", icon: FileClock, to: "/admin/logs", enabled: true },
  { label: "系统设置", icon: Settings, to: "/admin/settings", enabled: true },
];

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return <div className="flex h-full flex-col"><div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5"><div className="grid h-9 w-9 place-items-center rounded-sm bg-[#4fb89b] font-bold text-white">管</div><div><strong className="block text-sm text-white">智慧医疗管理</strong><span className="text-[11px] text-slate-400">System Administration</span></div></div><nav className="flex-1 space-y-1 px-3 py-5"><span className="mb-2 block px-3 text-[11px] font-semibold text-slate-500">系统管理</span>{navigation.map(({ label, icon: Icon, to, enabled }) => enabled ? <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => cn("flex h-10 items-center gap-3 rounded-sm px-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white", isActive && "bg-white/10 text-white")}><Icon className="h-[17px] w-[17px]" />{label}</NavLink> : <div key={to} className="flex h-10 items-center gap-3 px-3 text-sm text-slate-500" title={`${to} 即将开放`}><Icon className="h-[17px] w-[17px]" />{label}<span className="ml-auto text-[10px]">即将开放</span></div>)}</nav><div className="border-t border-white/10 p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#315563] text-xs font-semibold text-white">{(user?.realName || user?.username || "管").slice(0,1)}</div><div className="min-w-0"><strong className="block truncate text-sm text-white">{user?.realName || user?.username}</strong><span className="text-xs text-slate-400">管理员账号</span></div></div></div></div>;
}

export function AdminAppShell() {
  const [open, setOpen] = useState(false); const { user, logout } = useAuth(); const navigate = useNavigate();
  return <div className="min-h-screen bg-canvas text-foreground"><aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-[#17343d] lg:block"><AdminSidebar /></aside>{open && <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="关闭导航" className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} /><aside className="relative h-full w-[280px] bg-[#17343d]"><button aria-label="关闭管理导航" className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)}><X /></button><AdminSidebar onNavigate={() => setOpen(false)} /></aside></div>}<div className="lg:pl-60"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:px-7"><Button aria-label="打开管理导航" variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu /></Button><div className="hidden items-center gap-2 text-sm text-muted lg:flex"><Activity className="h-4 w-4 text-primary" />系统管理工作区</div><div className="flex items-center gap-2"><ShieldCheck className="hidden h-4 w-4 text-primary sm:block" /><button className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-canvas"><UserRound className="h-4 w-4" /><span className="hidden sm:inline">{user?.realName || user?.username}</span><ChevronDown className="h-3.5 w-3.5" /></button><Button variant="ghost" size="icon" aria-label="退出登录" onClick={() => { logout(); navigate("/login"); }}><LogOut className="h-4 w-4" /></Button></div></header><main className="px-4 py-6 md:px-7 md:py-8"><Outlet /></main></div></div>;
}
