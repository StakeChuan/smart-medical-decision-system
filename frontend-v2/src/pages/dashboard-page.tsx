import { RefreshCw, ShieldAlert } from "lucide-react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { DashboardSummary } from "@/features/dashboard/components/dashboard-summary";
import { PendingConsultationSection } from "@/features/dashboard/components/pending-consultation-section";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentConsultationSection } from "@/features/dashboard/components/recent-consultation-section";
import { RecentPatientSection } from "@/features/dashboard/components/recent-patient-section";
import { RecentReportSection } from "@/features/dashboard/components/recent-report-section";
import { useDoctorDashboard } from "@/features/dashboard/queries";
import { useAuth } from "@/features/auth/auth-context";

function DashboardSkeleton() {
  return <div className="space-y-5" aria-label="正在加载医生工作台"><div className="grid grid-cols-3 border border-border bg-surface">{[1, 2, 3].map((item) => <div className="border-r border-border p-4 last:border-r-0" key={item}><Skeleton className="h-20" /></div>)}</div><div className="dashboard-workflow-grid"><div className="space-y-5"><Skeleton className="h-60" /><Skeleton className="h-[430px]" /></div><div className="space-y-5"><Skeleton className="h-64" /><Skeleton className="h-52" /><Skeleton className="h-60" /></div></div></div>;
}

export function DashboardPage() {
  const { user } = useAuth(); const query = useDoctorDashboard();
  const today = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
  const doctorName = user?.realName || user?.username || "医生";
  const forbidden = query.error instanceof ApiError && query.error.code === "FORBIDDEN";
  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow={today} title={`早上好，${doctorName.endsWith("医生") ? doctorName : `${doctorName}医生`}`} description="先查看近期需要 AI 分析的问诊，再继续今天的临床工作。" actions={<Button variant="secondary" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />刷新工作台</Button>} />
    {query.isLoading && <DashboardSkeleton />}
    {query.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>无权访问医生工作台</strong><p>当前账号没有医生工作台权限，请重新登录医生账号或联系管理员。</p></div>}
    {query.isError && !forbidden && <ErrorState message={query.error instanceof Error ? query.error.message : "医生工作台暂时不可用"} onRetry={() => void query.refetch()} />}
    {query.data && <><DashboardSummary dashboard={query.data} /><div className="dashboard-workflow-grid"><div className="min-w-0 space-y-5"><PendingConsultationSection consultations={query.data.recentConsultations} /><RecentConsultationSection consultations={query.data.recentConsultations} /></div><aside className="space-y-5"><RecentPatientSection patients={query.data.recentPatients} /><RecentReportSection consultations={query.data.recentConsultations} /><QuickActions /></aside></div></>}
  </div>;
}
