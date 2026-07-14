import { ShieldAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { LogFilter, type LogFilterValue } from "./components/log-filter";
import { OperationLogHeader } from "./components/operation-log-header";
import { OperationLogPagination } from "./components/operation-log-pagination";
import { OperationLogTable } from "./components/operation-log-table";
import { useAdminOperationLogs } from "./queries";

const PAGE_SIZE = 5;
function validPage(value: string | null) { const page = Number(value); return Number.isInteger(page) && page > 0 ? page : 1; }

export function AdminOperationLogPage() {
  const [params, setParams] = useSearchParams();
  const filters = { keyword: params.get("keyword")?.trim() ?? "", module: params.get("module")?.trim() ?? "", action: params.get("action")?.trim() ?? "", page: validPage(params.get("page")), pageSize: PAGE_SIZE };
  const query = useAdminOperationLogs(filters);
  const forbidden = query.error instanceof ApiError && query.error.code === "FORBIDDEN";
  const hasFilters = Boolean(filters.keyword || filters.module || filters.action);
  const updateParams = (value: LogFilterValue, page = 1) => { const next = new URLSearchParams(); if (value.keyword) next.set("keyword", value.keyword); if (value.module) next.set("module", value.module); if (value.action) next.set("action", value.action); if (page > 1) next.set("page", String(page)); setParams(next); };
  const currentValue = { keyword: filters.keyword, module: filters.module, action: filters.action };
  return <div className="mx-auto max-w-[1440px]"><OperationLogHeader refreshing={query.isFetching} onRefresh={() => void query.refetch()} />
    {query.isLoading && <OperationLogSkeleton />}
    {query.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问操作日志</strong><p>后端拒绝了当前管理员会话，请重新登录或检查账号状态。</p></div>}
    {query.isError && !forbidden && <ErrorState message={query.error instanceof Error ? query.error.message : "操作日志暂时不可用"} onRetry={() => void query.refetch()} />}
    {query.data && <section className="workspace-section"><div className="section-heading"><div><h2>审计记录</h2><p>按操作时间与日志 ID 倒序展示</p></div>{query.isPlaceholderData && <span className="text-xs text-muted">正在加载第 {filters.page} 页…</span>}</div><LogFilter value={currentValue} disabled={query.isFetching} onApply={(value) => updateParams(value, 1)} onReset={() => updateParams({ keyword: "", module: "", action: "" }, 1)} />{query.data.items.length ? <OperationLogTable logs={query.data.items} /> : <EmptyState title={hasFilters ? "没有匹配日志" : "暂无操作记录"} description={hasFilters ? "请调整关键词、模块或操作筛选条件。" : "当前接口没有返回操作日志。"} />}<OperationLogPagination page={query.data.page} pageSize={query.data.pageSize || PAGE_SIZE} total={query.data.total} disabled={query.isFetching} onPageChange={(page) => updateParams(currentValue, page)} /></section>}
  </div>;
}

function OperationLogSkeleton() { return <section className="workspace-section" aria-label="正在加载操作日志"><div className="p-5"><Skeleton className="h-24" /></div>{[1,2,3,4,5].map((item) => <div className="border-t border-border p-4" key={item}><Skeleton className="h-16" /></div>)}</section>; }
