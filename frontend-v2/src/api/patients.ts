import { apiRequest } from "./client";
import { toPatient } from "./mappers";
import type { Patient, PatientDto } from "@/types/patient";

export async function getPatients(): Promise<Patient[]> {
  const dtos = await apiRequest<PatientDto[]>("/patients");
  return dtos.map(toPatient);
}

export async function getPatient(patientId: number): Promise<Patient> {
  const dto = await apiRequest<PatientDto>(`/patients/${patientId}`);
  return toPatient(dto);
}
