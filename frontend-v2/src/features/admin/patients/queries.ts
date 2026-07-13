import { queryOptions, useQuery } from "@tanstack/react-query";
import { getAdminPatient, getAdminPatientConsultations, getAdminPatients } from "@/api/admin-patients";
import { isValidEntityId, queryKeys } from "@/lib/queryKeys";

export function adminPatientsQueryOptions(doctorId: number | null = null) {
  return queryOptions({
    queryKey: queryKeys.admin.patients.list(doctorId),
    queryFn: () => getAdminPatients(doctorId),
  });
}

export function useAdminPatients(doctorId: number | null) {
  return useQuery(adminPatientsQueryOptions(doctorId));
}

export function useAdminPatient(patientId: number) {
  return useQuery({
    queryKey: queryKeys.admin.patients.detail(patientId),
    queryFn: () => getAdminPatient(patientId),
    enabled: isValidEntityId(patientId),
    retry: (failureCount, error) => {
      if (typeof error === "object" && error !== null && "status" in error && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useAdminPatientConsultations(patientId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.patients.consultations(patientId),
    queryFn: () => getAdminPatientConsultations(patientId),
    enabled: enabled && isValidEntityId(patientId),
  });
}
