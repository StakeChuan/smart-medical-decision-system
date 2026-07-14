import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { resetAdminDoctorPassword, updateAdminDoctor, updateAdminDoctorStatus } from "@/api/admin-doctors";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type {
  Doctor,
  DoctorAccount,
  ResetDoctorPasswordInput,
  ResetDoctorPasswordResult,
  UpdateDoctorInput,
  UpdateDoctorStatusInput,
} from "./types";

function mergeAccount(doctor: Doctor, account: DoctorAccount): Doctor {
  return { ...doctor, username: account.username, realName: account.realName, role: account.role, isActive: account.isActive };
}

function useDoctorAccountMutation<TInput>(options: {
  doctorId: number;
  mutationKey: readonly unknown[];
  mutationFn: (input: TInput) => Promise<DoctorAccount>;
  pendingMessage: string;
}) {
  const queryClient = useQueryClient();
  const submissionLock = useRef(false);
  const mutation = useMutation<DoctorAccount, ApiError, TInput>({
    mutationKey: options.mutationKey,
    mutationFn: options.mutationFn,
    retry: false,
    onSuccess: async (account) => {
      queryClient.setQueryData<Doctor | null>(queryKeys.admin.doctors.detail(options.doctorId), (current) => current ? mergeAccount(current, account) : current);
      queryClient.setQueriesData<Doctor[]>({ queryKey: ["admin", "doctors", "list"] }, (current) => current?.map((doctor) => doctor.id === account.id ? mergeAccount(doctor, account) : doctor));
      await queryClient.invalidateQueries({ queryKey: ["admin", "doctors", "list"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.doctors.detail(options.doctorId) });
    },
  });

  async function submit(input: TInput) {
    if (submissionLock.current || mutation.isPending) throw new ApiError(options.pendingMessage, { status: 409, code: "REQUEST_IN_PROGRESS" });
    submissionLock.current = true;
    try { return await mutation.mutateAsync(input); } finally { submissionLock.current = false; }
  }

  return { ...mutation, submit };
}

export function useUpdateDoctor(doctorId: number) {
  return useDoctorAccountMutation<UpdateDoctorInput>({ doctorId, mutationKey: queryKeys.admin.doctors.update(doctorId), mutationFn: updateAdminDoctor, pendingMessage: "医生资料正在保存，请勿重复操作。" });
}

export function useUpdateDoctorStatus(doctorId: number) {
  return useDoctorAccountMutation<UpdateDoctorStatusInput>({ doctorId, mutationKey: queryKeys.admin.doctors.status(doctorId), mutationFn: updateAdminDoctorStatus, pendingMessage: "医生账号状态正在更新，请勿重复操作。" });
}

export function useResetDoctorPassword(doctorId: number) {
  const submissionLock = useRef(false);
  const mutation = useMutation<ResetDoctorPasswordResult, ApiError, ResetDoctorPasswordInput>({
    mutationKey: queryKeys.admin.doctors.resetPassword(doctorId),
    mutationFn: resetAdminDoctorPassword,
    retry: false,
  });
  async function submit(input: ResetDoctorPasswordInput) {
    if (submissionLock.current || mutation.isPending) throw new ApiError("医生密码正在重置，请勿重复操作。", { status: 409, code: "REQUEST_IN_PROGRESS" });
    submissionLock.current = true;
    try { return await mutation.mutateAsync(input); } finally { submissionLock.current = false; }
  }
  return { ...mutation, submit };
}
