import { useQuery } from "@tanstack/react-query";
import { getAdminAiAudit } from "@/api/admin-ai";
import { queryKeys } from "@/lib/queryKeys";

export function useAdminAiAudit() {
  return useQuery({
    queryKey: queryKeys.admin.ai.audit,
    queryFn: getAdminAiAudit,
  });
}
