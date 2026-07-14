import { CircleCheck, Database, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { useSystemHealth } from "../queries";

export function SystemStatusPanel() {
  const query = useSystemHealth();
  return <section className="admin-settings-panel">
    <div className="admin-settings-panel-heading"><Server className="h-5 w-5" /><div><h2>连接状态</h2><p>来自后端健康检查接口的实时结果。</p></div><Button variant="ghost" size="icon" aria-label="刷新连接状态" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button></div>
    {query.isLoading && <div className="space-y-3 p-5"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>}
    {query.isError && <div className="admin-settings-status-error"><strong>连接状态暂不可用</strong><p>{query.error instanceof Error ? query.error.message : "无法获取系统连接状态"}</p><Button variant="secondary" size="sm" onClick={() => void query.refetch()}>重新检查</Button></div>}
    {query.data && <div className="admin-settings-status-list">
      <div><Server className="h-4 w-4" /><div><span>后端服务</span><strong>{query.data.serviceStatus === "ok" ? "运行正常" : query.data.serviceStatus}</strong></div><CircleCheck className="ml-auto h-4 w-4 text-success" /></div>
      <div><Database className="h-4 w-4" /><div><span>数据库连接</span><strong>{query.data.databaseStatus === "connected" ? "连接正常" : query.data.databaseStatus}</strong></div><CircleCheck className="ml-auto h-4 w-4 text-success" /></div>
    </div>}
  </section>;
}
