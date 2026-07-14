import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { OperationLog } from "../types";
import { OperationLogDetail } from "./operation-log-detail";

function display(value: string | null) { return value == null || value === "" ? "暂未提供" : value; }
function roleLabel(role: string | null) { if (role === "admin") return "管理员"; if (role === "doctor") return "医生"; return display(role); }

export function OperationLogTable({ logs }: { logs: OperationLog[] }) {
  return <div className="admin-log-table"><div className="admin-log-table-header" aria-hidden="true"><span>操作时间</span><span>操作用户</span><span>角色</span><span>操作类型</span><span>操作对象</span><span>操作描述</span></div><div className="divide-y divide-border">{logs.map((log) => <article className="admin-log-row" key={log.id}><div className="admin-log-time"><span>操作时间</span><strong>{formatDateTime(log.createdAt)}</strong></div><div className="admin-log-user"><span>操作用户</span><strong>{display(log.username)}</strong><small>{log.userId == null ? "用户 ID 暂未提供" : `用户 #${log.userId}`}</small></div><div className="admin-log-role"><span>角色</span><Badge tone={log.role === "admin" ? "info" : "neutral"}>{roleLabel(log.role)}</Badge></div><div className="admin-log-operation"><span>操作类型</span><strong>{display(log.module)}</strong><small>{display(log.action)}</small></div><div className="admin-log-target"><span>操作对象</span><strong>{display(log.targetType)}</strong><small>{log.targetId ? `#${log.targetId}` : "对象 ID 暂未提供"}</small></div><div className="admin-log-description"><span>操作描述</span><p>{display(log.detail)}</p><OperationLogDetail log={log} /></div></article>)}</div></div>;
}
