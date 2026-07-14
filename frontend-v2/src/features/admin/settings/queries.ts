import { useQuery } from "@tanstack/react-query";
import { getCurrentAccount, getSystemHealth } from "@/api/account";
import { queryKeys } from "@/lib/queryKeys";

export function useAdminAccount() {
  return useQuery({ queryKey: queryKeys.admin.settings.account, queryFn: getCurrentAccount });
}

export function useSystemHealth() {
  return useQuery({ queryKey: queryKeys.admin.settings.health, queryFn: getSystemHealth, retry: false });
}
