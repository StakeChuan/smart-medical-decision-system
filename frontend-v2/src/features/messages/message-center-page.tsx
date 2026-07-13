import { RefreshCw, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { MessageCategoryTabs } from "./components/message-category-tabs";
import { MessageCenterHeader } from "./components/message-center-header";
import { MessageList } from "./components/message-list";
import { MessageSummary } from "./components/message-summary";
import { useDoctorMessages } from "./queries";
import type { MessageCategory } from "./types";

function readReviewedIds(storageKey: string): Set<string> {
  try { const value = sessionStorage.getItem(storageKey); return new Set(value ? JSON.parse(value) as string[] : []); }
  catch { return new Set(); }
}

function MessageCenterSkeleton() {
  return <div className="space-y-5" aria-label="正在加载行动提醒中心"><div className="message-summary">{[1,2,3,4].map((item) => <div key={item}><Skeleton className="h-20" /></div>)}</div><div className="workspace-section"><Skeleton className="h-16" />{[1,2,3].map((item) => <div className="border-t border-border p-5" key={item}><Skeleton className="h-24" /></div>)}</div></div>;
}

export function MessageCenterPage() {
  const { user } = useAuth(); const messages = useDoctorMessages(); const query = messages.dashboardQuery;
  const storageKey = `doctor-action-reminders:${user?.id ?? "unknown"}`;
  const [category, setCategory] = useState<MessageCategory>("pending");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => readReviewedIds(storageKey));
  const currentIds = useMemo(() => new Set(messages.reminders.map((item) => item.id)), [messages.reminders]);
  const reviewedCount = [...reviewedIds].filter((id) => currentIds.has(id)).length;
  const pendingCount = Math.max(messages.reminders.length - reviewedCount, 0);
  const forbidden = query.error instanceof ApiError && query.error.code === "FORBIDDEN";
  const refreshing = query.isFetching || messages.isSupplementFetching;
  const markReviewed = (id: string) => setReviewedIds((current) => { const next = new Set(current); next.add(id); sessionStorage.setItem(storageKey, JSON.stringify([...next])); return next; });
  const doctorName = user?.realName || user?.username || "医生";

  return <div className="mx-auto max-w-[1440px]"><MessageCenterHeader doctorName={doctorName.endsWith("医生") ? doctorName : `${doctorName}医生`} />
    {query.isLoading && <MessageCenterSkeleton />}
    {query.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问行动提醒中心</strong><p>当前账号没有医生工作流访问权限，请重新登录医生账号或联系管理员。</p></div>}
    {query.isError && !forbidden && <ErrorState message={query.error instanceof Error ? query.error.message : "行动提醒中心暂时不可用"} onRetry={() => void messages.refetch()} />}
    {query.data && <><MessageSummary pending={pendingCount} analysis={messages.reminders.filter((item) => item.type === "pending_analysis" && !reviewedIds.has(item.id)).length} risk={messages.reminders.filter((item) => item.type === "risk_review" && !reviewedIds.has(item.id)).length} reviewed={reviewedCount} /><section className="message-workspace"><div className="message-workspace-heading"><div><h2>下一步处理</h2><p>每条近期问诊只保留一个最高优先级行动提醒</p></div><Button variant="ghost" size="sm" disabled={refreshing} onClick={() => void messages.refetch()}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />刷新</Button></div><MessageCategoryTabs value={category} onChange={setCategory} pendingCount={pendingCount} reviewedCount={reviewedCount} /><MessageList category={category} reminders={messages.reminders} reviewedIds={reviewedIds} onOpen={markReviewed} /></section></>}
  </div>;
}
