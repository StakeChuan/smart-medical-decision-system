export interface AiReportDto {
  报告ID: number;
  问诊ID: number;
  患者摘要: string | null;
  关键发现: string | null;
  风险等级: string | null;
  紧急程度: string | null;
  复诊建议: string | null;
  结构化摘要: string | null;
  可能疾病: string | null;
  建议检查: string | null;
  辅助建议: string | null;
  风险提示: string | null;
  完整报告: string | null;
  创建时间: string;
}

export type RiskLevel = "low" | "medium" | "high" | "pending" | "unknown";
export type UrgencyLevel = "routine" | "soon" | "urgent" | "emergency" | "unknown";

export interface StructuredReport {
  patientSummary?: string;
  keyFindings?: string;
  possibleDiseases?: string;
  suggestedChecks?: string;
  riskLevel?: string;
  urgencyLevel?: string;
  treatmentAdvice?: string;
  followUpAdvice?: string;
  riskWarning?: string;
  fullReport?: string;
}

export interface AiReport {
  id: number;
  consultationId: number;
  patientSummary: string | null;
  keyFindings: string | null;
  riskLevel: RiskLevel;
  riskLevelRaw: string | null;
  urgencyLevel: UrgencyLevel;
  urgencyLevelRaw: string | null;
  followUpAdvice: string | null;
  structuredSummary: StructuredReport | null;
  possibleDiseases: string | null;
  suggestedChecks: string | null;
  treatmentAdvice: string | null;
  riskWarning: string | null;
  fullReport: string | null;
  createdAt: string;
}

export interface GenerateReportOptions {
  force?: boolean;
  confirmed?: boolean;
}
