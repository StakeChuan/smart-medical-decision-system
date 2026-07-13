import { ArrowRight, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { AiCenterRecord } from "../types";
import { RiskStatusBadge } from "./risk-status-badge";

export function CompletedReportSection({ records }: { records: AiCenterRecord[] }) {
  return <section className="workspace-section" aria-labelledby="completed-reports-title"><div className="section-heading"><div><h2 id="completed-reports-title">已完成报告</h2><p>进入报告页完成医生审核</p></div></div>{records.length ? <div className="divide-y divide-border">{records.map((record) => <article className="ai-center-compact-row" key={record.consultationId}><div className="dashboard-report-icon"><FileCheck2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{record.patientName}</strong><RiskStatusBadge record={record} /></div><p>{formatDateTime(record.consultationTime)} · 问诊 #{record.consultationId}</p></div><Button asChild variant="ghost" size="icon" aria-label={`审核${record.patientName}的报告`}><Link to={`/doctor/patients/${record.patientId}/consultations/${record.consultationId}/report`}><ArrowRight className="h-4 w-4" /></Link></Button></article>)}</div> : <EmptyState title="暂无已完成报告" description="近期问诊中尚无可审核的 AI 辅助报告。" />}</section>;
}
