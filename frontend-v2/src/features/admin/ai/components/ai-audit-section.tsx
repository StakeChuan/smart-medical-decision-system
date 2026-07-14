import { ArrowRight, FileClock, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/states";
import type { AdminAiAuditRecord } from "../types";

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

interface AiAuditSectionProps {
  records?: AdminAiAuditRecord[];
  total?: number;
  isLoading: boolean;
  errorMessage?: string;
  forbidden: boolean;
  onRetry: () => void;
}

export function AiAuditSection({ records, total, isLoading, errorMessage, forbidden, onRetry }: AiAuditSectionProps) {
  return <section className="admin-ai-panel"><div className="admin-ai-panel-heading"><FileClock className="h-5 w-5" /><div><h2>AI 生成审计</h2><p>最近 5 条成功写入的生成或重新生成记录，共 {total ?? 0} 条；该数据不包含失败调用。</p></div><Button asChild variant="ghost" size="sm"><Link to="/admin/logs?module=AI%E6%8A%A5%E5%91%8A">完整日志<ArrowRight className="h-4 w-4" /></Link></Button></div>{isLoading && <div className="divide-y divide-border" aria-label="正在加载 AI 审计记录">{[1,2,3].map((item) => <div className="p-4 sm:p-5" key={item}><Skeleton className="h-16" /></div>)}</div>}{errorMessage && <div className="admin-ai-audit-error"><ShieldAlert className="h-5 w-5" /><div><strong>{forbidden ? "暂无权限读取 AI 审计" : "AI 审计加载失败"}</strong><p>{errorMessage}</p></div><Button variant="secondary" size="sm" onClick={onRetry}>重新加载</Button></div>}{records && records.length > 0 && <div className="admin-ai-audit-list">{records.map((record) => <article key={record.id}><div className="admin-ai-audit-action"><span>{record.action}</span><small>日志 #{record.id}</small></div><div><strong>{record.detail || "未提供操作详情"}</strong><p>{record.username || "未知用户"} · {record.role || "角色未提供"}</p></div><div><span>{record.targetType || "对象类型未提供"} {record.targetId ? `#${record.targetId}` : ""}</span><time dateTime={record.createdAt}>{formatDateTime(record.createdAt)}</time></div></article>)}</div>}{records && records.length === 0 && <EmptyState title="暂无 AI 生成审计记录" description="操作日志接口当前没有返回 AI 报告生成或重新生成记录。" />}</section>;
}
