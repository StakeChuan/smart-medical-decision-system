import { ShieldCheck } from "lucide-react";

export function AdminDashboardHeader({ adminName }: { adminName: string }) {
  return <header className="page-heading"><div><p className="mb-2 text-xs font-semibold text-primary">系统运行概览</p><h1 className="text-2xl font-semibold">系统管理中心</h1><p className="mt-2 text-sm text-muted">{adminName}，查看智慧医疗辅助决策系统运行状态。</p></div><div className="admin-header-role"><ShieldCheck className="h-4 w-4" /><span>管理员只读概览</span></div></header>;
}
