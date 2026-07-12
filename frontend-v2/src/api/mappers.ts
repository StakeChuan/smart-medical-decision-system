import type { Consultation, PatientConsultationDto } from "@/types/consultation";
import type { Patient, PatientDto } from "@/types/patient";
import type { AiReport, AiReportDto, RiskLevel, StructuredReport, UrgencyLevel } from "@/types/report";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function parseStructuredSummary(value: string | null): StructuredReport | null {
  if (!value?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return null;
    const summary: StructuredReport = {
      patientSummary: optionalString(parsed.patient_summary ?? parsed.患者摘要),
      keyFindings: optionalString(parsed.key_findings ?? parsed.关键发现),
      possibleDiseases: optionalString(parsed.possible_diseases ?? parsed.可能疾病),
      suggestedChecks: optionalString(parsed.suggested_checks ?? parsed.建议检查),
      riskLevel: optionalString(parsed.risk_level ?? parsed.风险等级),
      urgencyLevel: optionalString(parsed.urgency_level ?? parsed.紧急程度),
      treatmentAdvice: optionalString(parsed.treatment_advice ?? parsed.辅助建议),
      followUpAdvice: optionalString(parsed.follow_up_advice ?? parsed.复诊建议),
      riskWarning: optionalString(parsed.risk_warning ?? parsed.风险提示),
      fullReport: optionalString(parsed.full_report ?? parsed.完整报告),
    };
    return Object.values(summary).some(Boolean) ? summary : null;
  } catch {
    return null;
  }
}

export function normalizeRiskLevel(value: string | null): RiskLevel {
  const text = value?.trim().toLowerCase() ?? "";
  if (!text) return "unknown";
  if (text.includes("待评估") || text.includes("pending")) return "pending";
  if (text.includes("高") || text.includes("high")) return "high";
  if (text.includes("中") || text.includes("medium") || text.includes("moderate")) return "medium";
  if (text.includes("低") || text.includes("low")) return "low";
  return "unknown";
}

export function normalizeUrgencyLevel(value: string | null): UrgencyLevel {
  const text = value?.trim().toLowerCase() ?? "";
  if (!text) return "unknown";
  if (text.includes("急诊") || text.includes("立即") || text.includes("emergency")) return "emergency";
  if (text.includes("紧急") || text.includes("urgent")) return "urgent";
  if (text.includes("尽快") || text.includes("较急") || text.includes("soon")) return "soon";
  if (text.includes("常规") || text.includes("routine")) return "routine";
  return "unknown";
}

export function toPatient(dto: PatientDto): Patient {
  return {
    id: dto.患者ID,
    name: dto.姓名,
    gender: dto.性别,
    age: dto.年龄,
    phone: dto.电话,
    address: dto.地址,
    doctorId: dto.医生ID,
    medicalHistory: dto.既往病史,
    allergyHistory: dto.过敏史,
    createdAt: dto.创建时间,
  };
}

export function toAiReport(dto: AiReportDto): AiReport {
  return {
    id: dto.报告ID,
    consultationId: dto.问诊ID,
    patientSummary: dto.患者摘要,
    keyFindings: dto.关键发现,
    riskLevel: normalizeRiskLevel(dto.风险等级),
    riskLevelRaw: dto.风险等级,
    urgencyLevel: normalizeUrgencyLevel(dto.紧急程度),
    urgencyLevelRaw: dto.紧急程度,
    followUpAdvice: dto.复诊建议,
    structuredSummary: parseStructuredSummary(dto.结构化摘要),
    possibleDiseases: dto.可能疾病,
    suggestedChecks: dto.建议检查,
    treatmentAdvice: dto.辅助建议,
    riskWarning: dto.风险提示,
    fullReport: dto.完整报告,
    createdAt: dto.创建时间,
  };
}

export function toConsultation(dto: PatientConsultationDto): Consultation {
  return {
    id: dto.问诊ID,
    patientId: dto.患者ID,
    doctorId: dto.医生ID,
    chiefComplaint: dto.主诉,
    symptoms: dto.症状,
    presentIllness: dto.现病史,
    pastHistory: dto.既往史,
    examination: dto.检查结果,
    createdAt: dto.创建时间,
    aiReport: dto.AI报告 ? toAiReport(dto.AI报告) : null,
  };
}
