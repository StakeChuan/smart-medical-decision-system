import { useQuery } from "@tanstack/react-query";
import { getDoctorDashboard } from "@/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";

export function useDoctorDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.doctor,
    queryFn: getDoctorDashboard,
  });
}
