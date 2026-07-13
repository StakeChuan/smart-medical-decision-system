import { ArrowRight, BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { AiCenterRecord } from "../types";

export function PendingAnalysisSection({ records }: { records: AiCenterRecord[] }) {
  return <section className="workspace-section" aria-labelledby="pending-analysis-title"><div className="section-heading"><div><h2 id="pending-analysis-title">待分析问诊</h2><p>尚未生成 AI 辅助分析报告</p></div></div>{records.length ? <div className="divide-y divide-border">{records.map((record) => <article className="ai-center-compact-row" key={record.consultationId}><div className="dashboard-report-icon text-primary"><BrainCircuit className="h-4 w-4" /></div><div className="min-w-0 flex-1"><strong>{record.patientName}</strong><p>{formatDateTime(record.consultationTime)} · 问诊 #{record.consultationId}</p></div><Button asChild variant="ghost" size="icon" aria-label={`进入${record.patientName}的辅助分析`}><Link to={`/doctor/patients/${record.patientId}/consultations/${record.consultationId}/diagnosis`}><ArrowRight className="h-4 w-4" /></Link></Button></article>)}</div> : <EmptyState title="暂无待分析问诊" description="近期问诊均已有 AI 辅助报告。" />}</section>;
}
