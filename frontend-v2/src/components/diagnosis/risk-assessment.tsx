import { AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AiReport } from "@/types/report";

const riskTone = { low: "success", medium: "warning", high: "danger", pending: "warning", unknown: "neutral" } as const;

export function RiskAssessment({ report }: { report: AiReport }) {
  const warning = report.riskWarning || report.structuredSummary?.riskWarning;
  return <section className="diagnosis-section risk-section" aria-labelledby="risk-assessment-title"><div className="diagnosis-section-heading"><div><span>风险审查</span><h2 id="risk-assessment-title">风险与紧急程度</h2></div><AlertOctagon className="h-5 w-5 text-danger" /></div><div className="flex flex-wrap gap-3 border-b border-border p-5"><Badge tone={riskTone[report.riskLevel]}>风险：{report.riskLevelRaw || "未评估"}</Badge><Badge tone={report.urgencyLevel === "emergency" || report.urgencyLevel === "urgent" ? "danger" : "neutral"}>紧急程度：{report.urgencyLevelRaw || "未评估"}</Badge></div><div className="p-5"><span className="clinical-label">风险解释</span><p className={warning ? "mt-2 text-sm leading-7" : "mt-2 text-sm leading-7 text-muted"}>{warning || "报告未提供风险解释，请医生结合临床资料判断。"}</p></div></section>;
}
