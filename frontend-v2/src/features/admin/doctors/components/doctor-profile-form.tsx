import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle, UserRoundPen } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateDoctor } from "../mutations";
import type { Doctor } from "../types";

const schema = z.object({ realName: z.string().trim().max(50, "医生姓名不能超过 50 个字符") });
type FormValues = z.infer<typeof schema>;

export function DoctorProfileForm({ doctor }: { doctor: Doctor }) {
  const mutation = useUpdateDoctor(doctor.id);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { realName: doctor.realName ?? "" } });
  useEffect(() => reset({ realName: doctor.realName ?? "" }), [doctor.realName, reset]);

  async function submit(values: FormValues) {
    mutation.reset(); setSaved(false);
    try { const account = await mutation.submit({ doctorId: doctor.id, username: doctor.username, realName: values.realName || null }); reset({ realName: account.realName ?? "" }); setSaved(true); } catch { /* Rendered below. */ }
  }

  return <section className="doctor-security-card"><div className="doctor-security-heading"><UserRoundPen className="h-5 w-5" /><div><h3>医生资料</h3><p>用户名保持只读，仅修改接口支持的医生姓名。</p></div></div><form onSubmit={handleSubmit(submit)} noValidate><div className="doctor-security-fields"><label><span>用户名</span><Input value={doctor.username} disabled aria-label="医生用户名" /></label><label><span>医生姓名</span><div><Input aria-label="医生姓名" maxLength={50} aria-invalid={Boolean(errors.realName)} {...register("realName")} />{errors.realName && <span className="field-error">{errors.realName.message}</span>}</div></label></div>{mutation.error && <div className="doctor-security-error" role="alert">{mutation.error.message}</div>}{saved && <div className="doctor-security-success" role="status"><CheckCircle2 className="h-4 w-4" />医生资料已保存</div>}<div className="doctor-security-actions"><Button type="submit" disabled={!isDirty || mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="h-4 w-4 animate-spin" />正在保存</> : "保存资料"}</Button></div></form></section>;
}
