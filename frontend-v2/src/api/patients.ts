import { apiRequest } from "./client";
import { toPatient } from "./mappers";
import type { CreatePatientDto, CreatePatientInput, Patient, PatientDto } from "@/types/patient";

export async function getPatients(): Promise<Patient[]> {
  const dtos = await apiRequest<PatientDto[]>("/patients");
  return dtos.map(toPatient);
}

export async function getPatient(patientId: number): Promise<Patient> {
  const dto = await apiRequest<PatientDto>(`/patients/${patientId}`);
  return toPatient(dto);
}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const payload: CreatePatientDto = {
    姓名: input.name,
    性别: input.gender,
    年龄: input.age,
    电话: input.phone,
    地址: input.address,
    既往病史: input.medicalHistory,
    过敏史: input.allergyHistory,
  };
  const dto = await apiRequest<PatientDto>("/patients", { method: "POST", body: JSON.stringify(payload) });
  return toPatient(dto);
}
