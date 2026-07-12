import { apiRequest } from "./client";
import { toPatient } from "./mappers";
import type { Patient, PatientDto } from "@/types/patient";

export async function getPatient(patientId: number): Promise<Patient> {
  const dto = await apiRequest<PatientDto>(`/patients/${patientId}`);
  return toPatient(dto);
}
