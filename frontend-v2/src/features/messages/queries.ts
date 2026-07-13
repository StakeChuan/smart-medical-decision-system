import { useMemo } from "react";
import { useAiCenterRecords } from "@/features/ai-center/use-ai-center-records";
import type { AiCenterRecord } from "@/features/ai-center/types";
import type { DoctorActionReminder } from "./types";

function toReminder(record: AiCenterRecord): DoctorActionReminder {
  const diagnosisPath = `/doctor/patients/${record.patientId}/consultations/${record.consultationId}/diagnosis`;
  const reportPath = `/doctor/patients/${record.patientId}/consultations/${record.consultationId}/report`;

  if (!record.hasAiReport) {
    return {
      id: `pending-analysis:${record.consultationId}`,
      type: "pending_analysis",
      patientId: record.patientId,
      patientName: record.patientName,
      consultationId: record.consultationId,
      consultationTime: record.consultationTime,
      reportCreatedAt: null,
      chiefComplaint: record.chiefComplaint,
      title: "需要 AI 辅助分析",
      description: "该问诊尚未生成 AI 辅助分析报告，请医生确认问诊资料后处理。",
      riskLevel: null,
      riskLabel: "待评估",
      urgencyLabel: null,
      riskWarning: null,
      supplementState: record.supplementState,
      destination: diagnosisPath,
    };
  }

  const hasRiskInformation = record.supplementState === "ready" && (
    Boolean(record.riskLabel && record.riskLabel !== "未提供")
    || Boolean(record.urgencyLabel)
    || Boolean(record.riskWarning)
  );

  return {
    id: `${hasRiskInformation ? "risk-review" : "report-review"}:${record.consultationId}`,
    type: hasRiskInformation ? "risk_review" : "report_review",
    patientId: record.patientId,
    patientName: record.patientName,
    consultationId: record.consultationId,
    consultationTime: record.consultationTime,
    reportCreatedAt: record.reportCreatedAt,
    chiefComplaint: record.chiefComplaint,
    title: hasRiskInformation ? "需要审核风险信息" : "AI 辅助分析报告待审核",
    description: hasRiskInformation
      ? "报告包含后端返回的风险或紧急程度信息，请医生结合临床资料审核。"
      : "AI 辅助分析报告已生成，请医生审核报告内容。",
    riskLevel: record.riskLevel,
    riskLabel: record.supplementState === "error" ? "暂不可用" : record.riskLabel,
    urgencyLabel: record.urgencyLabel,
    riskWarning: record.riskWarning,
    supplementState: record.supplementState,
    destination: reportPath,
  };
}

export function useDoctorMessages() {
  const center = useAiCenterRecords();
  const reminders = useMemo(
    () => center.records.map(toReminder),
    [center.records],
  );

  return {
    ...center,
    reminders,
    riskReviewCount: reminders.filter((item) => item.type === "risk_review").length,
    pendingAnalysisCount: reminders.filter((item) => item.type === "pending_analysis").length,
  };
}
