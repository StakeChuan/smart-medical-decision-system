import { apiRequest } from "./client";
import { toConsultation } from "./mappers";
import type { Consultation, ConsultationDto, CreateConsultationDto, CreateConsultationInput, PatientConsultationDto } from "@/types/consultation";

export async function getPatientConsultations(patientId: number): Promise<Consultation[]> {
  const dto = await apiRequest<PatientConsultationDto[]>(`/patients/${patientId}/consultations`);
  return dto.map(toConsultation);
}

export async function createConsultation(input: CreateConsultationInput): Promise<Consultation> {
  const payload: CreateConsultationDto = {
    患者ID: input.patientId,
    医生ID: null,
    主诉: input.chiefComplaint,
    症状: input.symptoms,
    现病史: input.presentIllness,
    既往史: input.pastHistory,
    检查结果: input.examination,
  };
  const dto = await apiRequest<ConsultationDto>("/consultations", { method: "POST", body: JSON.stringify(payload) });
  return toConsultation(dto);
}
