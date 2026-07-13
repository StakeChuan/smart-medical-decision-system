import { ArrowRight, BrainCircuit, FileText, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import type { AiCenterRecord } from "../types";
import { RiskStatusBadge } from "./risk-status-badge";

export function RecentAiConsultations({ records }: { records: AiCenterRecord[] }) {
  return <section className="workspace-section" aria-labelledby="recent-ai-consultations-title"><div className="section-heading"><div><h2 id="recent-ai-consultations-title">近期 AI 辅助分析</h2><p>范围为 Dashboard 最近 5 条问诊</p></div></div>{records.length ? <div className="divide-y divide-border">{records.map((record) => { const destination = record.hasAiReport ? `/doctor/patients/${record.patientId}/consultations/${record.consultationId}/report` : `/doctor/patients/${record.patientId}/consultations/${record.consultationId}/diagnosis`; return <article className="ai-center-record" key={record.consultationId}><div className="row-icon"><Stethoscope /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{record.patientName}</strong><Badge tone={record.hasAiReport ? "success" : "warning"}>{record.hasAiReport ? "报告已生成" : "待 AI 分析"}</Badge><RiskStatusBadge record={record} /></div><p>{record.chiefComplaint || "主诉未记录"}</p><span>{formatDateTime(record.consultationTime)} · 问诊 #{record.consultationId}</span></div><Button asChild variant="secondary" size="sm"><Link to={destination}>{record.hasAiReport ? <FileText className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}{record.hasAiReport ? "审核报告" : "进入辅助分析"}<ArrowRight className="h-4 w-4" /></Link></Button></article>; })}</div> : <EmptyState title="暂无 AI 辅助诊断记录" description="近期没有可展示的问诊记录。" />}</section>;
}
