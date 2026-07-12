import { ArrowLeft, FileQuestion } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AIClinicalSummary } from "@/components/diagnosis/ai-clinical-summary";
import { DiagnosisConclusion } from "@/components/diagnosis/diagnosis-conclusion";
import { RiskAssessment } from "@/components/diagnosis/risk-assessment";
import { FullReportCollapse } from "@/components/report/full-report-collapse";
import { ReportActions } from "@/components/report/report-actions";
import { ReportHeader } from "@/components/report/report-header";
import { ReportMeta } from "@/components/report/report-meta";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useConsultation } from "@/features/consultations/queries";
import { usePatient } from "@/features/patients/queries";
import { useGenerateReport } from "@/features/reports/queries";
import type { AiReport } from "@/types/report";

function reportText(report: AiReport) {
  if (report.fullReport?.trim()) return report.fullReport;
  const fields = [
    ["患者摘要", report.patientSummary || report.structuredSummary?.patientSummary], ["关键发现", report.keyFindings || report.structuredSummary?.keyFindings], ["可能疾病", report.possibleDiseases || report.structuredSummary?.possibleDiseases], ["建议检查", report.suggestedChecks || report.structuredSummary?.suggestedChecks], ["风险等级", report.riskLevelRaw], ["紧急程度", report.urgencyLevelRaw], ["风险提示", report.riskWarning || report.structuredSummary?.riskWarning], ["辅助建议", report.treatmentAdvice || report.structuredSummary?.treatmentAdvice], ["复诊建议", report.followUpAdvice || report.structuredSummary?.followUpAdvice],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  return fields.length ? fields.map(([label, value]) => `${label}\n${value}`).join("\n\n") : "当前报告未提供可复制内容。";
}

export function ReportPage() {
  const params = useParams(); const patientId = Number(params.patientId); const consultationId = Number(params.consultationId);
  const patientQuery = usePatient(patientId); const consultationQuery = useConsultation(patientId, consultationId); const generation = useGenerateReport(patientId, consultationId);
  const report = generation.data || consultationQuery.data?.aiReport || null;
  const invalid = !Number.isInteger(patientId) || patientId <= 0 || !Number.isInteger(consultationId) || consultationId <= 0;
  async function regenerate() { if (!window.confirm("重新生成会覆盖当前 AI 报告，确定继续吗？")) return; generation.reset(); try { await generation.generate({ force: true, confirmed: true }); } catch { /* Rendered below. */ } }

  if (invalid) return <ErrorState message="患者或问诊编号无效，请返回患者详情重新选择。" />;
  if (patientQuery.isLoading || consultationQuery.isLoading) return <div className="mx-auto max-w-[1240px] space-y-5"><Skeleton className="h-40" /><Skeleton className="h-24" /><Skeleton className="h-[520px]" /></div>;
  const loadError = patientQuery.error || consultationQuery.error;
  if (loadError) return <ErrorState message={loadError instanceof Error ? loadError.message : "报告资料暂时不可用"} onRetry={() => { void patientQuery.refetch(); void consultationQuery.refetch(); }} />;
  if (!patientQuery.data || !consultationQuery.data) return <ErrorState message="未找到对应患者或问诊记录。" />;
  if (!report) return <div className="mx-auto max-w-[900px]"><section className="diagnosis-section"><div className="medical-empty min-h-64"><FileQuestion className="h-7 w-7 text-muted" /><strong>该问诊尚无 AI 报告</strong><p>请先进入 AI 诊断工作区完成报告生成。</p><Button asChild><Link to={`/doctor/patients/${patientId}/consultations/${consultationId}/diagnosis`}><ArrowLeft className="h-4 w-4" />进入 AI 诊断</Link></Button></div></section></div>;

  return <article className="report-page mx-auto max-w-[1240px]"><ReportHeader patient={patientQuery.data} consultation={consultationQuery.data} /><ReportActions copyText={reportText(report)} isRegenerating={generation.isPending} onRegenerate={regenerate} />{generation.isError && <div className="mb-5 border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-danger">{generation.error?.message || "重新生成失败，请稍后重试。"}</div>}<ReportMeta report={report} regenerated={generation.isSuccess} /><div className="space-y-5"><AIClinicalSummary report={report} /><div className="report-two-column"><DiagnosisConclusion report={report} /><RiskAssessment report={report} /></div><FullReportCollapse fullReport={report.fullReport || report.structuredSummary?.fullReport || null} /></div></article>;
}
