import type { RiskLevel } from "@/types/report";

export type AiCenterSupplementState = "loading" | "ready" | "error";

export interface AiCenterRecord {
  consultationId: number;
  patientId: number;
  patientName: string;
  chiefComplaint: string | null;
  consultationTime: string | null;
  hasAiReport: boolean;
  riskLevel: RiskLevel | null;
  riskLabel: string;
  urgencyLabel: string | null;
  riskWarning: string | null;
  reportCreatedAt: string | null;
  supplementState: AiCenterSupplementState;
}
