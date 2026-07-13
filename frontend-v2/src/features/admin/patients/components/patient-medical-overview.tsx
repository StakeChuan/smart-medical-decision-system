import { BrainCircuit, ClipboardList, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { AdminPatientConsultation } from "../types";

export function PatientMedicalOverview({ consultations, isLoading, error, onRetry }: { consultations?: AdminPatientConsultation[]; isLoading: boolean; error: Error | null; onRetry: () => void }) {
  if (isLoading) return <section className="workspace-section"><div className="section-heading"><div><h2>医疗概览</h2><p>正在读取患者问诊记录</p></div></div><div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">{[1,2,3].map((item) => <Skeleton className="h-24" key={item} />)}</div></section>;
  if (error) return <section className="workspace-section"><div className="admin-related-error"><div><strong>医疗概览加载失败</strong><p>{error.message}</p></div><Button variant="secondary" size="sm" onClick={onRetry}>重新加载</Button></div></section>;
  if (!consultations?.length) return <section className="workspace-section"><div className="section-heading"><div><h2>医疗概览</h2><p>按需读取该患者的真实问诊记录</p></div></div><EmptyState title="暂无问诊记录" description="该患者当前没有问诊或 AI 报告记录。" /></section>;
  const reportCount = consultations.filter((item) => item.hasAiReport).length;
  const lastTime = consultations.reduce<string | null>((latest, item) => !latest || new Date(item.createdAt) > new Date(latest) ? item.createdAt : latest, null);
  const metrics = [{ label: "问诊次数", value: String(consultations.length), icon: ClipboardList }, { label: "AI 报告数量", value: String(reportCount), icon: BrainCircuit }, { label: "最近问诊", value: formatDateTime(lastTime), icon: Clock3 }];
  return <section className="workspace-section"><div className="section-heading"><div><h2>医疗概览</h2><p>统计仅基于该患者问诊历史接口的真实返回</p></div></div><div className="admin-patient-clinical-metrics">{metrics.map(({ label, value, icon: Icon }) => <div key={label}><Icon className="h-4 w-4 text-primary" /><span>{label}</span><strong>{value}</strong></div>)}</div><div className="divide-y divide-border">{consultations.slice(0,5).map((item) => <article className="admin-patient-consultation-row" key={item.id}><div><strong>问诊 #{item.id}</strong><p>{item.chiefComplaint || "主诉暂未提供"}</p></div><div><BadgeLabel hasReport={item.hasAiReport} /><span>{formatDateTime(item.createdAt)}</span></div></article>)}</div></section>;
}

function BadgeLabel({ hasReport }: { hasReport: boolean }) { return <Badge tone={hasReport ? "success" : "neutral"}>{hasReport ? "已有 AI 报告" : "暂无 AI 报告"}</Badge>; }
