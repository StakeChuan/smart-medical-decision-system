import { ListChecks } from "lucide-react";
import type { AiReport } from "@/types/report";

export function DiagnosisConclusion({ report }: { report: AiReport }) {
  const diseases = report.possibleDiseases || report.structuredSummary?.possibleDiseases;
  const checks = report.suggestedChecks || report.structuredSummary?.suggestedChecks;
  return <section className="diagnosis-section" aria-labelledby="diagnosis-conclusion-title"><div className="diagnosis-section-heading"><div><span>医生审核项</span><h2 id="diagnosis-conclusion-title">诊断结论与建议检查</h2></div><ListChecks className="h-5 w-5 text-primary" /></div><div className="ai-summary-grid"><div><span>可能疾病</span><p className={diseases ? "" : "text-muted"}>{diseases || "报告未提供可能疾病"}</p></div><div><span>建议检查</span><p className={checks ? "" : "text-muted"}>{checks || "报告未提供建议检查"}</p></div></div></section>;
}
