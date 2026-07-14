import { Activity, BarChart3, Clock3, FileText, Gauge, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";

interface AiStatisticsProps {
  reportCount?: number;
  isLoading: boolean;
  errorMessage?: string;
  forbidden: boolean;
  onRetry: () => void;
}

const unavailable = [
  { label: "今日调用", icon: Clock3 },
  { label: "成功次数", icon: Activity },
  { label: "失败次数", icon: XCircle },
  { label: "Token 消耗", icon: Gauge },
];

export function AiStatistics({ reportCount, isLoading, errorMessage, forbidden, onRetry }: AiStatisticsProps) {
  return <section className="admin-ai-panel"><div className="admin-ai-panel-heading"><BarChart3 className="h-5 w-5" /><div><h2>AI 使用统计</h2><p>报告记录数不等于模型调用次数，也不能用于计算成功率。</p></div></div><div className="admin-ai-stat-grid"><div className="admin-ai-stat-primary"><FileText className="h-4 w-4" /><span>AI 报告记录数</span>{isLoading ? <Skeleton className="mt-3 h-8 w-20" /> : errorMessage ? <><strong>暂不可用</strong><p>{forbidden ? "暂无权限读取管理员统计。" : errorMessage}</p><Button variant="ghost" size="sm" onClick={onRetry}>重新加载</Button></> : <><strong>{reportCount ?? "暂无数据"}</strong><p>当前数据库中保存的报告记录</p></>}</div>{unavailable.map(({ label, icon: Icon }) => <div className="admin-ai-stat-unavailable" key={label}><Icon className="h-4 w-4" /><span>{label}</span><strong>暂未提供</strong></div>)}</div></section>;
}
