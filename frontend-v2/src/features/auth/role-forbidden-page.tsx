import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";

export function RoleForbiddenPage({ area }: { area: "admin" | "doctor" }) {
  const { user } = useAuth(); const home = user?.role === "admin" ? "/admin/dashboard" : "/doctor/dashboard";
  return <main className="grid min-h-screen place-items-center bg-canvas px-5"><div className="max-w-lg border border-border bg-surface p-8 text-center"><ShieldX className="mx-auto h-8 w-8 text-danger" /><p className="mt-4 text-xs font-semibold text-danger">403 NO PERMISSION</p><h1 className="mt-2 text-xl font-semibold">暂无权限访问{area === "admin" ? "管理员中心" : "医生工作区"}</h1><p className="mt-3 text-sm leading-6 text-muted">当前账号角色不允许访问该页面，系统没有发起受限区域的数据请求。</p><Button asChild className="mt-6"><Link to={home}>返回当前账号工作台</Link></Button></div></main>;
}
