export interface PatientDto {
  姓名: string;
  性别: string | null;
  年龄: number | null;
  电话: string | null;
  地址: string | null;
  医生ID: number | null;
  既往病史: string | null;
  过敏史: string | null;
  患者ID: number;
  创建时间: string;
}

export interface Patient {
  id: number;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  address: string | null;
  doctorId: number | null;
  medicalHistory: string | null;
  allergyHistory: string | null;
  createdAt: string;
}
