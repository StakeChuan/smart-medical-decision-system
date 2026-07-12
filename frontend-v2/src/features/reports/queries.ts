import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiError } from "@/api/client";
import { generateReport } from "@/api/reports";
import { patientConsultationsQueryOptions } from "@/features/consultations/queries";
import { isValidEntityId, queryKeys } from "@/lib/queryKeys";
import type { Consultation } from "@/types/consultation";
import type { AiReport, GenerateReportOptions } from "@/types/report";

export function useReport(patientId: number, consultationId: number) {
  const queryClient = useQueryClient();
  const enabled = isValidEntityId(patientId) && isValidEntityId(consultationId);
  return useQuery({
    queryKey: queryKeys.reports.detail(patientId, consultationId),
    queryFn: async () => {
      const consultations = await queryClient.ensureQueryData(
        patientConsultationsQueryOptions(patientId),
      );
      return consultations.find((item) => item.id === consultationId)?.aiReport ?? null;
    },
    enabled,
  });
}

export function useGenerateReport(patientId: number, consultationId: number) {
  const queryClient = useQueryClient();
  const submissionLock = useRef(false);
  const mutation = useMutation<AiReport, ApiError, GenerateReportOptions>({
    mutationKey: queryKeys.reports.generate(patientId, consultationId),
    mutationFn: (options) => generateReport(consultationId, options),
    retry: false,
    onSuccess: async (report) => {
      const consultationsKey = queryKeys.patients.consultations(patientId);
      queryClient.setQueryData<Consultation[]>(consultationsKey, (current) =>
        current?.map((item) => item.id === consultationId ? { ...item, aiReport: report } : item),
      );
      queryClient.setQueryData<Consultation | null>(
        queryKeys.consultations.detail(patientId, consultationId),
        (current) => current ? { ...current, aiReport: report } : current,
      );
      queryClient.setQueryData(queryKeys.reports.detail(patientId, consultationId), report);
      await queryClient.invalidateQueries({ queryKey: consultationsKey });
    },
  });

  async function generate(options: GenerateReportOptions = {}): Promise<AiReport> {
    if (!isValidEntityId(patientId) || !isValidEntityId(consultationId)) {
      throw new ApiError("患者或问诊标识无效。", {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }
    if (submissionLock.current || mutation.isPending) {
      throw new ApiError("AI 报告正在生成，请勿重复提交。", {
        status: 409,
        code: "REQUEST_IN_PROGRESS",
      });
    }
    submissionLock.current = true;
    try {
      return await mutation.mutateAsync(options);
    } finally {
      submissionLock.current = false;
    }
  }

  return {
    data: mutation.data,
    error: mutation.error,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
    generate,
  };
}
