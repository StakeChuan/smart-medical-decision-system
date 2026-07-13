import type { AiCenterSupplementState } from "@/features/ai-center/types";
import type { RiskLevel } from "@/types/report";

export type DoctorActionReminderType = "pending_analysis" | "report_review" | "risk_review";

export interface DoctorActionReminder {
  id: string;
  type: DoctorActionReminderType;
  patientId: number;
  patientName: string;
  consultationId: number;
  consultationTime: string | null;
  reportCreatedAt: string | null;
  chiefComplaint: string | null;
  title: string;
  description: string;
  riskLevel: RiskLevel | null;
  riskLabel: string | null;
  urgencyLabel: string | null;
  riskWarning: string | null;
  supplementState: AiCenterSupplementState;
  destination: string;
}

export type MessageCategory = "pending" | "reviewed" | "system";
