import { RefreshCw, ShieldAlert, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { AiCenterHeader } from "./components/ai-center-header";
import { AiCenterSummary } from "./components/ai-center-summary";
import { CompletedReportSection } from "./components/completed-report-section";
import { PendingAnalysisSection } from "./components/pending-analysis-section";
import { RecentAiConsultations } from "./components/recent-ai-consultations";
import { useAiCenterRecords } from "./use-ai-center-records";

function AiCenterSkeleton() {
  return <div className="space-y-5" aria-label="正在加载 AI 辅助决策中心"><div className="grid grid-cols-3 border border-border bg-surface">{[1,2,3].map((item) => <div className="border-r border-border p-4 last:border-r-0" key={item}><Skeleton className="h-20" /></div>)}</div><div className="ai-center-layout"><Skeleton className="h-[520px]" /><div className="space-y-5"><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div></div>;
}

export function AiCenterPage() {
  const { user } = useAuth(); const center = useAiCenterRecords(); const query = center.dashboardQuery;
  const doctorName = user?.realName || user?.username || "医生";
  const forbidden = query.error instanceof ApiError && query.error.code === "FORBIDDEN";
  const refreshing = query.isFetching || center.isSupplementFetching;
  return <div className="mx-auto max-w-[1440px]"><AiCenterHeader doctorName={doctorName.endsWith("医生") ? doctorName : `${doctorName}医生`} actions={<Button variant="secondary" size="sm" disabled={refreshing} onClick={() => void center.refetch()}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />刷新记录</Button>} />
    {query.isLoading && <AiCenterSkeleton />}
    {query.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>无权访问 AI 辅助决策中心</strong><p>当前账号没有医生审核权限，请重新登录医生账号或联系管理员。</p></div>}
    {query.isError && !forbidden && <ErrorState message={query.error instanceof Error ? query.error.message : "AI 辅助决策中心暂时不可用"} onRetry={() => void center.refetch()} />}
    {query.data && <><AiCenterSummary recent={center.records.length} pending={center.pendingRecords.length} completed={center.completedRecords.length} />{center.records.length ? <div className="ai-center-layout"><RecentAiConsultations records={center.records} /><aside className="space-y-5"><PendingAnalysisSection records={center.pendingRecords} /><CompletedReportSection records={center.completedRecords} /></aside></div> : <section className="ai-center-empty"><Stethoscope className="h-7 w-7 text-primary" /><strong>暂无 AI 辅助诊断记录</strong><p>创建问诊后，可在这里集中查看 AI 辅助分析状态与报告。</p><div><Button asChild variant="secondary"><Link to="/doctor/patients"><Users className="h-4 w-4" />进入患者管理</Link></Button><Button asChild><Link to="/doctor/consultations/new"><Stethoscope className="h-4 w-4" />新建问诊</Link></Button></div></section>}</>}
  </div>;
}
