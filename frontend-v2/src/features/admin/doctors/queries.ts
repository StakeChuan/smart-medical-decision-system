import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminDoctorPatients, getAdminDoctors } from "@/api/admin-doctors";
import { isValidEntityId, queryKeys } from "@/lib/queryKeys";

export function adminDoctorsQueryOptions(keyword = "") {
  const normalized = keyword.trim();
  return queryOptions({ queryKey: queryKeys.admin.doctors.list(normalized), queryFn: () => getAdminDoctors(normalized) });
}

export function useAdminDoctors(keyword: string) {
  return useQuery(adminDoctorsQueryOptions(keyword));
}

export function useAdminDoctor(doctorId: number) {
  const queryClient = useQueryClient(); const enabled = isValidEntityId(doctorId);
  return useQuery({
    queryKey: queryKeys.admin.doctors.detail(doctorId),
    queryFn: async () => {
      const doctors = await queryClient.ensureQueryData(adminDoctorsQueryOptions());
      return doctors.find((doctor) => doctor.id === doctorId) ?? null;
    },
    enabled,
  });
}

export function useAdminDoctorPatients(doctorId: number, enabled: boolean) {
  return useQuery({ queryKey: queryKeys.admin.doctors.patients(doctorId), queryFn: () => getAdminDoctorPatients(doctorId), enabled: enabled && isValidEntityId(doctorId) });
}
