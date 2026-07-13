import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "@/api/admin";
import { queryKeys } from "@/lib/queryKeys";

export function useAdminDashboard() {
  return useQuery({ queryKey: queryKeys.admin.dashboard, queryFn: getAdminDashboard });
}
