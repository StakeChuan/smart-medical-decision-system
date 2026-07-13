import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiError } from "@/api/client";
import { createPatient } from "@/api/patients";
import { queryKeys } from "@/lib/queryKeys";
import type { CreatePatientInput, Patient } from "@/types/patient";

export function useCreatePatient() {
  const queryClient = useQueryClient(); const submissionLock = useRef(false);
  const mutation = useMutation<Patient, ApiError, CreatePatientInput>({
    mutationKey: queryKeys.patients.create,
    mutationFn: createPatient,
    retry: false,
    onSuccess: async (patient) => {
      queryClient.setQueryData<Patient[]>(queryKeys.patients.all, (current) => current ? [patient, ...current.filter((item) => item.id !== patient.id)] : [patient]);
      queryClient.setQueryData(queryKeys.patients.detail(patient.id), patient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
  async function submit(input: CreatePatientInput) {
    if (submissionLock.current || mutation.isPending) throw new ApiError("患者档案正在提交，请勿重复操作。", { status: 409, code: "REQUEST_IN_PROGRESS" });
    submissionLock.current = true;
    try { return await mutation.mutateAsync(input); } finally { submissionLock.current = false; }
  }
  return { ...mutation, submit };
}
