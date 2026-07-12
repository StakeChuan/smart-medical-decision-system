import { useQuery } from "@tanstack/react-query";
import { getPatient } from "@/api/patients";
import { isValidEntityId, queryKeys } from "@/lib/queryKeys";

export function usePatient(patientId: number) {
  const enabled = isValidEntityId(patientId);
  return useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => getPatient(patientId),
    enabled,
  });
}
