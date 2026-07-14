import { ApiError } from "@/api/client";
import { useAdminDashboard } from "@/features/admin/queries";
import { AiAuditSection } from "./components/ai-audit-section";
import { AiManagementHeader } from "./components/ai-management-header";
import { AiReportOverview } from "./components/ai-report-overview";
import { AiServiceStatus } from "./components/ai-service-status";
import { AiStatistics } from "./components/ai-statistics";
import { useAdminAiAudit } from "./queries";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试。";
}

export function AdminAiManagementPage() {
  const dashboardQuery = useAdminDashboard();
  const auditQuery = useAdminAiAudit();
  const dashboardForbidden = dashboardQuery.error instanceof ApiError && dashboardQuery.error.code === "FORBIDDEN";
  const auditForbidden = auditQuery.error instanceof ApiError && auditQuery.error.code === "FORBIDDEN";
  const refreshing = dashboardQuery.isFetching || auditQuery.isFetching;

  return <div className="mx-auto max-w-[1440px]"><AiManagementHeader refreshing={refreshing} onRefresh={() => { void dashboardQuery.refetch(); void auditQuery.refetch(); }} /><div className="admin-ai-scope"><strong>数据边界</strong><p>本中心只展示报告记录与操作审计。服务状态、调用统计和全局报告列表尚无对应管理员接口。</p></div><div className="admin-ai-layout"><div className="min-w-0 space-y-5"><AiStatistics reportCount={dashboardQuery.data?.summary.aiReportCount} isLoading={dashboardQuery.isLoading} errorMessage={dashboardQuery.isError ? errorMessage(dashboardQuery.error) : undefined} forbidden={dashboardForbidden} onRetry={() => void dashboardQuery.refetch()} /><AiAuditSection records={auditQuery.data?.items} total={auditQuery.data?.total} isLoading={auditQuery.isLoading} errorMessage={auditQuery.isError ? errorMessage(auditQuery.error) : undefined} forbidden={auditForbidden} onRetry={() => void auditQuery.refetch()} /></div><aside className="space-y-5"><AiServiceStatus /><AiReportOverview /></aside></div></div>;
}
