import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { CreatePatientInput } from "@/types/patient";
import { PatientFormFields, type PatientFormValues } from "./patient-form-fields";
import { PatientSubmitBar } from "./patient-submit-bar";

const optionalText = (max: number) => z.string().trim().max(max, `内容不能超过 ${max} 个字符`);
const schema: z.ZodType<PatientFormValues> = z.object({
  name: z.string().trim().min(1, "请输入患者姓名").max(50, "姓名不能超过 50 个字符"),
  gender: optionalText(20),
  age: z.string().trim().refine((value) => !value || /^\d+$/.test(value), "年龄必须是整数").refine((value) => !value || (Number(value) >= 0 && Number(value) <= 150), "年龄必须在 0 到 150 之间"),
  phone: z.string().trim().refine((value) => !value || /^[0-9+\-\s]{6,20}$/.test(value), "电话格式不正确"),
  address: optionalText(500), medicalHistory: optionalText(2000), allergyHistory: optionalText(2000),
});

export function PatientForm({ isSubmitting, serverError, onSubmit }: { isSubmitting: boolean; serverError: string; onSubmit: (input: CreatePatientInput) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors } } = useForm<PatientFormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", gender: "", age: "", phone: "", address: "", medicalHistory: "", allergyHistory: "" } });
  const submit = (values: PatientFormValues) => onSubmit({ name: values.name, gender: values.gender || null, age: values.age ? Number(values.age) : null, phone: values.phone || null, address: values.address || null, medicalHistory: values.medicalHistory || null, allergyHistory: values.allergyHistory || null });
  return <form className="patient-form" onSubmit={handleSubmit(submit)} noValidate><PatientFormFields register={register} errors={errors} />{serverError && <div className="patient-form-error" role="alert">{serverError}</div>}<PatientSubmitBar isSubmitting={isSubmitting} /></form>;
}
