import { ClipboardCheck } from "lucide-react";
import type { AiReport } from "@/types/report";

export function AIClinicalSummary({ report }: { report: AiReport }) {
  const summary = report.patientSummary || report.structuredSummary?.patientSummary;
  const findings = report.keyFindings || report.structuredSummary?.keyFindings;
  return <section className="diagnosis-section" aria-labelledby="ai-summary-title"><div className="diagnosis-section-heading"><div><span>AI 结构化输出</span><h2 id="ai-summary-title">临床摘要</h2></div><ClipboardCheck className="h-5 w-5 text-primary" /></div><div className="ai-summary-grid"><div><span>患者摘要</span><p className={summary ? "" : "text-muted"}>{summary || "报告未提供患者摘要"}</p></div><div><span>关键发现</span><p className={findings ? "" : "text-muted"}>{findings || "报告未提供关键发现"}</p></div></div></section>;
}
