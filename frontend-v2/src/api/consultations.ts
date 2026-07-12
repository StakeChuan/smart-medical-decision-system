import { apiRequest } from "./client";
import { toConsultation } from "./mappers";
import type { Consultation, PatientConsultationDto } from "@/types/consultation";

export async function getPatientConsultations(patientId: number): Promise<Consultation[]> {
  const dto = await apiRequest<PatientConsultationDto[]>(`/patients/${patientId}/consultations`);
  return dto.map(toConsultation);
}
