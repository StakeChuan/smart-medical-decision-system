import { RefreshCw, ShieldAlert } from "lucide-react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { ActivePatientSection, RecentPatientSection } from "./components/patient-overview-sections";
import { AdminDashboardHeader } from "./components/admin-dashboard-header";
import { AdminQuickActions } from "./components/admin-quick-actions";
import { DoctorRankingSection } from "./components/doctor-ranking-section";
import { SystemSummary } from "./components/system-summary";
import { TrendSection } from "./components/trend-section";
import { useAdminDashboard } from "./queries";

function AdminDashboardSkeleton() {
  return <div className="space-y-5" aria-label="正在加载管理员工作台"><div className="admin-summary">{[1,2,3,4,5].map((item) => <div key={item}><Skeleton className="h-20" /></div>)}</div><div className="admin-dashboard-grid"><div className="space-y-5"><Skeleton className="h-80" /><Skeleton className="h-80" /></div><div className="space-y-5"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-60" /></div></div></div>;
}

export function AdminDashboardPage() {
  const { user } = useAuth(); const query = useAdminDashboard();
  const forbidden = query.error instanceof ApiError && query.error.code === "FORBIDDEN";
  const adminName = user?.realName || user?.username || "管理员";
  return <div className="mx-auto max-w-[1440px]"><AdminDashboardHeader adminName={adminName} />
    {query.isLoading && <AdminDashboardSkeleton />}
    {query.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问管理员中心</strong><p>后端拒绝了当前管理员会话，请重新登录或检查账号状态。</p></div>}
    {query.isError && !forbidden && <ErrorState message={query.error instanceof Error ? query.error.message : "管理员工作台暂时不可用"} onRetry={() => void query.refetch()} />}
    {query.data && <><div className="mb-5 flex justify-end"><Button variant="ghost" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />刷新数据</Button></div><SystemSummary summary={query.data.summary} /><div className="admin-dashboard-grid"><div className="min-w-0 space-y-5"><TrendSection data={query.data.consultationTrend} /><DoctorRankingSection doctors={query.data.topDoctors} /></div><aside className="space-y-5"><RecentPatientSection patients={query.data.recentPatients} /><ActivePatientSection patients={query.data.activePatients} /><AdminQuickActions /></aside></div></>}
  </div>;
}
