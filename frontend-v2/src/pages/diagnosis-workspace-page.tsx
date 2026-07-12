import { AlertCircle, ArrowLeft, BrainCircuit, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AIClinicalSummary } from "@/components/diagnosis/ai-clinical-summary";
import { AIConfidenceScore } from "@/components/diagnosis/ai-confidence-score";
import { ConsultationSummary } from "@/components/diagnosis/consultation-summary";
import { DiagnosisConclusion } from "@/components/diagnosis/diagnosis-conclusion";
import { EvidenceCitation } from "@/components/diagnosis/evidence-citation";
import { PatientContextPanel } from "@/components/diagnosis/patient-context-panel";
import { RiskAssessment } from "@/components/diagnosis/risk-assessment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useConsultation } from "@/features/consultations/queries";
import { usePatient } from "@/features/patients/queries";
import { useGenerateReport } from "@/features/reports/queries";
import { formatDateTime } from "@/lib/utils";
import type { AiReport } from "@/types/report";

type AIState = "idle" | "analyzing" | "success" | "partial" | "error";

function reportIsPartial(report: AiReport) {
  const core = [report.patientSummary || report.structuredSummary?.patientSummary, report.keyFindings || report.structuredSummary?.keyFindings, report.possibleDiseases || report.structuredSummary?.possibleDiseases, report.suggestedChecks || report.structuredSummary?.suggestedChecks, report.riskLevelRaw];
  return core.filter(Boolean).length < 4;
}

export function DiagnosisWorkspacePage() {
  const params = useParams();
  const patientId = Number(params.patientId); const consultationId = Number(params.consultationId);
  const patientQuery = usePatient(patientId); const consultationQuery = useConsultation(patientId, consultationId);
  const generation = useGenerateReport(patientId, consultationId);
  const report = generation.data || consultationQuery.data?.aiReport || null;
  const state: AIState = generation.isPending ? "analyzing" : generation.isError ? "error" : report ? (reportIsPartial(report) ? "partial" : "success") : "idle";
  const isInvalid = !Number.isInteger(patientId) || patientId <= 0 || !Number.isInteger(consultationId) || consultationId <= 0;
  const stateMeta = useMemo(() => ({ idle: ["等待生成", "尚未生成 AI 辅助报告"], analyzing: ["分析中", "正在整理病史、识别关键发现并评估风险"], success: ["分析完成", "结构化报告已生成，请医生审核"], partial: ["部分完成", "报告部分字段缺失，请结合原始问诊审核"], error: ["生成失败", generation.error?.message || "AI 报告生成失败"] }[state]), [state, generation.error]);

  async function handleGenerate(force = false) {
    if (force && !window.confirm("重新生成会覆盖当前 AI 报告，确定继续吗？")) return;
    generation.reset();
    try { await generation.generate(force ? { force: true, confirmed: true } : {}); } catch { /* Mutation state renders the error. */ }
  }

  if (isInvalid) return <ErrorState message="患者或问诊编号无效，请返回患者详情重新选择。" />;
  if (patientQuery.isLoading || consultationQuery.isLoading) return <div className="mx-auto max-w-[1440px] space-y-5"><Skeleton className="h-24" /><div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"><Skeleton className="h-[520px]" /><Skeleton className="h-[680px]" /></div></div>;
  const loadError = patientQuery.error || consultationQuery.error;
  if (loadError) return <ErrorState message={loadError instanceof Error ? loadError.message : "问诊资料暂时不可用"} onRetry={() => { void patientQuery.refetch(); void consultationQuery.refetch(); }} />;
  if (!patientQuery.data || !consultationQuery.data) return <ErrorState message="未找到对应患者或问诊记录。" />;

  return <div className="mx-auto max-w-[1440px]">
    <div className="diagnosis-page-header"><div><Button asChild variant="ghost" size="sm" className="mb-3 px-0"><Link to={`/doctor/patients/${patientId}`}><ArrowLeft className="h-4 w-4" />返回患者详情</Link></Button><h1>AI 辅助诊断工作区</h1><p>问诊 #{consultationId} · {formatDateTime(consultationQuery.data.createdAt)}</p></div><div className="flex flex-wrap items-center gap-3"><Badge tone={state === "error" ? "danger" : state === "partial" ? "warning" : state === "success" ? "success" : "info"}>{stateMeta[0]}</Badge>{report ? <Button variant="secondary" disabled={generation.isPending} onClick={() => void handleGenerate(true)}><RefreshCw className="h-4 w-4" />重新生成</Button> : <Button disabled={generation.isPending} onClick={() => void handleGenerate()}><BrainCircuit className="h-4 w-4" />生成 AI 报告</Button>}</div></div>
    <div className="diagnosis-layout"><PatientContextPanel patient={patientQuery.data} /><main className="min-w-0 space-y-5"><ConsultationSummary consultation={consultationQuery.data} />
      <section className={`analysis-status analysis-status-${state}`} aria-live="polite">{state === "analyzing" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : state === "error" ? <AlertCircle className="h-5 w-5" /> : state === "success" || state === "partial" ? <CheckCircle2 className="h-5 w-5" /> : <BrainCircuit className="h-5 w-5" />}<div><strong>{stateMeta[0]}</strong><p>{stateMeta[1]}</p>{state === "analyzing" && <div className="analysis-steps"><span>整理问诊资料</span><span>识别关键发现</span><span>评估风险</span><span>生成结构化建议</span></div>}</div></section>
      {state === "idle" && <section className="diagnosis-section"><div className="medical-empty min-h-52"><BrainCircuit className="h-7 w-7 text-primary" /><strong>准备开始辅助分析</strong><p>系统将基于当前问诊内容生成结构化辅助报告，结果需要医生审核。</p><Button onClick={() => void handleGenerate()} disabled={generation.isPending}>开始分析</Button></div></section>}
      {state === "error" && <section className="diagnosis-section"><div className="medical-empty min-h-48"><AlertCircle className="h-7 w-7 text-danger" /><strong>本次分析未完成</strong><p>{generation.error?.message || "请检查服务状态后重试。"}</p><Button variant="secondary" onClick={() => void handleGenerate()} disabled={generation.isPending}>重新尝试</Button></div></section>}
      {report && <><AIClinicalSummary report={report} /><div className="diagnosis-two-column"><DiagnosisConclusion report={report} /><RiskAssessment report={report} /></div><div className="diagnosis-two-column"><EvidenceCitation /><AIConfidenceScore /></div></>}
    </main></div>
  </div>;
}
