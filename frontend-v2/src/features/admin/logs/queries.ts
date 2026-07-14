import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminOperationLogs } from "@/api/admin-logs";
import { queryKeys } from "@/lib/queryKeys";
import type { OperationLogFilters } from "./types";

export function useAdminOperationLogs(filters: OperationLogFilters) {
  return useQuery({
    queryKey: queryKeys.admin.logs.list(filters.keyword, filters.module, filters.action, filters.page, filters.pageSize),
    queryFn: () => getAdminOperationLogs(filters),
    placeholderData: keepPreviousData,
  });
}
