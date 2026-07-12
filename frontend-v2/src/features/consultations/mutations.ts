import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiError } from "@/api/client";
import { createConsultation } from "@/api/consultations";
import { queryKeys } from "@/lib/queryKeys";
import type { Consultation, CreateConsultationInput } from "@/types/consultation";

export function useCreateConsultation() {
  const queryClient = useQueryClient(); const submissionLock = useRef(false);
  const mutation = useMutation<Consultation, ApiError, CreateConsultationInput>({
    mutationKey: queryKeys.consultations.create,
    mutationFn: createConsultation,
    retry: false,
    onSuccess: (consultation) => {
      queryClient.setQueryData<Consultation[]>(queryKeys.patients.consultations(consultation.patientId), (current) => current ? [consultation, ...current.filter((item) => item.id !== consultation.id)] : [consultation]);
      queryClient.setQueryData(queryKeys.consultations.detail(consultation.patientId, consultation.id), consultation);
    },
  });

  async function submit(input: CreateConsultationInput) {
    if (submissionLock.current || mutation.isPending) throw new ApiError("问诊正在提交，请勿重复操作。", { status: 409, code: "REQUEST_IN_PROGRESS" });
    submissionLock.current = true;
    try { return await mutation.mutateAsync(input); } finally { submissionLock.current = false; }
  }
  return { ...mutation, submit };
}
