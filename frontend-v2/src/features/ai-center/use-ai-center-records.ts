import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { patientConsultationsQueryOptions } from "@/features/consultations/queries";
import { useDoctorDashboard } from "@/features/dashboard/queries";
import type { Consultation } from "@/types/consultation";
import type { AiCenterRecord, AiCenterSupplementState } from "./types";

export function useAiCenterRecords() {
  const dashboardQuery = useDoctorDashboard();
  const patientIds = useMemo(() => [...new Set((dashboardQuery.data?.recentConsultations ?? []).map((item) => item.patientId))].slice(0, 5), [dashboardQuery.data?.recentConsultations]);
  const consultationQueries = useQueries({ queries: patientIds.map((patientId) => ({ ...patientConsultationsQueryOptions(patientId), enabled: dashboardQuery.isSuccess })) });
  const records = useMemo<AiCenterRecord[]>(() => {
    const queryByPatient = new Map(patientIds.map((patientId, index) => [patientId, consultationQueries[index]]));
    return (dashboardQuery.data?.recentConsultations ?? []).map((item) => {
      const supplementalQuery = queryByPatient.get(item.patientId);
      const consultation = supplementalQuery?.data?.find((candidate: Consultation) => candidate.id === item.consultationId);
      const supplementState: AiCenterSupplementState = supplementalQuery?.isError ? "error" : supplementalQuery?.isPending ? "loading" : "ready";
      let riskLabel = "待评估"; let riskLevel = null;
      if (item.hasAiReport) {
        if (supplementState === "error") riskLabel = "暂不可用";
        else if (supplementState === "loading") riskLabel = "加载中";
        else if (consultation?.aiReport) { riskLevel = consultation.aiReport.riskLevel; riskLabel = consultation.aiReport.riskLevelRaw || "未提供"; }
        else riskLabel = "未提供";
      }
      return { consultationId: item.consultationId, patientId: item.patientId, patientName: item.patientName, chiefComplaint: item.chiefComplaint, consultationTime: item.createdAt, hasAiReport: item.hasAiReport, riskLevel, riskLabel, supplementState };
    });
  }, [consultationQueries, dashboardQuery.data?.recentConsultations, patientIds]);

  async function refetch() {
    await dashboardQuery.refetch();
    await Promise.all(consultationQueries.map((query) => query.refetch()));
  }

  return { dashboardQuery, records, pendingRecords: records.filter((item) => !item.hasAiReport), completedRecords: records.filter((item) => item.hasAiReport), uniquePatientCount: patientIds.length, isSupplementFetching: consultationQueries.some((query) => query.isFetching), refetch };
}
