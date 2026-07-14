import { RefreshCw, Settings, ShieldAlert } from "lucide-react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { AccountProfileForm } from "./components/account-profile-form";
import { CapabilityBoundaryPanel } from "./components/capability-boundary-panel";
import { PasswordForm } from "./components/password-form";
import { SystemStatusPanel } from "./components/system-status-panel";
import { useAdminAccount } from "./queries";

export function AdminSettingsPage() {
  const account = useAdminAccount();
  const forbidden = account.error instanceof ApiError && account.error.code === "FORBIDDEN";
  return <div className="mx-auto max-w-[1320px]">
    <PageHeader eyebrow="系统管理" title="系统设置" description="管理当前管理员资料、账号密码，并查看系统连接状态。" actions={<Button variant="ghost" size="sm" disabled={account.isFetching} onClick={() => void account.refetch()}><RefreshCw className={`h-4 w-4 ${account.isFetching ? "animate-spin" : ""}`} />刷新账号</Button>} />
    <div className="admin-settings-scope"><Settings className="h-5 w-5" /><div><strong>本阶段设置范围</strong><p>仅接入后端已经支持的当前账号资料、密码修改和健康检查，不包含角色权限或系统参数配置。</p></div></div>
    {account.isLoading && <div className="admin-settings-layout"><div className="space-y-5"><Skeleton className="h-[430px]" /><Skeleton className="h-[500px]" /></div><div className="space-y-5"><Skeleton className="h-64" /><Skeleton className="h-72" /></div></div>}
    {account.isError && forbidden && <div className="permission-state border border-warning/20 bg-warning/5"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问系统设置</strong><p>后端拒绝了当前管理员会话，请重新登录或检查账号状态。</p></div>}
    {account.isError && !forbidden && <ErrorState message={account.error instanceof Error ? account.error.message : "账号设置暂时不可用"} onRetry={() => void account.refetch()} />}
    {account.data && <div className="admin-settings-layout"><div className="min-w-0 space-y-5"><AccountProfileForm account={account.data} /><PasswordForm /></div><aside className="min-w-0 space-y-5"><SystemStatusPanel /><CapabilityBoundaryPanel /></aside></div>}
  </div>;
}
