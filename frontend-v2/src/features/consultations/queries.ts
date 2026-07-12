import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPatientConsultations } from "@/api/consultations";
import { isValidEntityId, queryKeys } from "@/lib/queryKeys";

export function patientConsultationsQueryOptions(patientId: number) {
  return queryOptions({
    queryKey: queryKeys.patients.consultations(patientId),
    queryFn: () => getPatientConsultations(patientId),
  });
}

export function usePatientConsultations(patientId: number) {
  const enabled = isValidEntityId(patientId);
  return useQuery({
    ...patientConsultationsQueryOptions(patientId),
    enabled,
  });
}

export function useConsultation(patientId: number, consultationId: number) {
  const queryClient = useQueryClient();
  const enabled = isValidEntityId(patientId) && isValidEntityId(consultationId);
  return useQuery({
    queryKey: queryKeys.consultations.detail(patientId, consultationId),
    queryFn: async () => {
      const consultations = await queryClient.ensureQueryData(
        patientConsultationsQueryOptions(patientId),
      );
      return consultations.find((item) => item.id === consultationId) ?? null;
    },
    enabled,
  });
}
