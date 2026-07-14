import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { changeCurrentPassword, updateCurrentProfile } from "@/api/account";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type { AdminAccount, ChangePasswordInput, UpdateAdminProfileInput } from "./types";

export function useUpdateAdminProfile() {
  const queryClient = useQueryClient();
  const submissionLock = useRef(false);
  const mutation = useMutation<AdminAccount, ApiError, UpdateAdminProfileInput>({
    mutationKey: queryKeys.admin.settings.updateProfile,
    mutationFn: updateCurrentProfile,
    retry: false,
    onSuccess: (account) => queryClient.setQueryData(queryKeys.admin.settings.account, account),
  });

  async function submit(input: UpdateAdminProfileInput) {
    if (submissionLock.current || mutation.isPending) {
      throw new ApiError("账号资料正在保存，请勿重复操作。", { status: 409, code: "REQUEST_IN_PROGRESS" });
    }
    submissionLock.current = true;
    try { return await mutation.mutateAsync(input); } finally { submissionLock.current = false; }
  }

  return { ...mutation, submit };
}

export function useChangeAdminPassword() {
  const submissionLock = useRef(false);
  const mutation = useMutation<void, ApiError, ChangePasswordInput>({
    mutationKey: queryKeys.admin.settings.changePassword,
    mutationFn: changeCurrentPassword,
    retry: false,
  });

  async function submit(input: ChangePasswordInput) {
    if (submissionLock.current || mutation.isPending) {
      throw new ApiError("密码正在修改，请勿重复操作。", { status: 409, code: "REQUEST_IN_PROGRESS" });
    }
    submissionLock.current = true;
    try { return await mutation.mutateAsync(input); } finally { submissionLock.current = false; }
  }

  return { ...mutation, submit };
}
