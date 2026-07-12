import type { AiReport, AiReportDto } from "./report";

export interface ConsultationDto {
  患者ID: number;
  医生ID: number | null;
  主诉: string | null;
  症状: string | null;
  现病史: string | null;
  既往史: string | null;
  检查结果: string | null;
  问诊ID: number;
  创建时间: string;
}

export interface PatientConsultationDto extends ConsultationDto {
  AI报告: AiReportDto | null;
}

export interface CreateConsultationDto {
  患者ID: number;
  医生ID: null;
  主诉: string;
  症状: string | null;
  现病史: string | null;
  既往史: string | null;
  检查结果: string | null;
}

export interface CreateConsultationInput {
  patientId: number;
  chiefComplaint: string;
  symptoms: string | null;
  presentIllness: string | null;
  pastHistory: string | null;
  examination: string | null;
}

export interface Consultation {
  id: number;
  patientId: number;
  doctorId: number | null;
  chiefComplaint: string | null;
  symptoms: string | null;
  presentIllness: string | null;
  pastHistory: string | null;
  examination: string | null;
  createdAt: string;
  aiReport: AiReport | null;
}
