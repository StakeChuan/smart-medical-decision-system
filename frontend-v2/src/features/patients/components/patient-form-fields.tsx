import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";

export interface PatientFormValues {
  name: string;
  gender: string;
  age: string;
  phone: string;
  address: string;
  medicalHistory: string;
  allergyHistory: string;
}

function FieldError({ message }: { message?: string }) { return message ? <span role="alert" className="field-error">{message}</span> : null; }

export function PatientFormFields({ register, errors }: { register: UseFormRegister<PatientFormValues>; errors: FieldErrors<PatientFormValues> }) {
  return <>
    <section className="patient-form-section"><div className="patient-form-section-heading"><span>基本信息</span><h2>患者身份与联系方式</h2><p>姓名为必填项，其余信息可在后续档案维护中补充。</p></div><div className="patient-form-fields">
      <label><div><span>姓名 <b>*</b></span><p>患者真实姓名，最多 50 个字符</p></div><div><Input placeholder="请输入患者姓名" aria-invalid={Boolean(errors.name)} {...register("name")} /><FieldError message={errors.name?.message} /></div></label>
      <label><div><span>性别</span><p>用于患者身份信息展示</p></div><div><select aria-invalid={Boolean(errors.gender)} {...register("gender")}><option value="">未填写</option><option value="男">男</option><option value="女">女</option><option value="其他">其他</option></select><FieldError message={errors.gender?.message} /></div></label>
      <label><div><span>年龄</span><p>允许填写 0 至 150 岁</p></div><div><Input type="number" min="0" max="150" inputMode="numeric" placeholder="请输入年龄" aria-invalid={Boolean(errors.age)} {...register("age")} /><FieldError message={errors.age?.message} /></div></label>
      <label><div><span>电话</span><p>6 至 20 位，可包含数字、空格、+ 或 -</p></div><div><Input type="tel" placeholder="请输入联系电话" aria-invalid={Boolean(errors.phone)} {...register("phone")} /><FieldError message={errors.phone?.message} /></div></label>
      <label><div><span>地址</span><p>患者当前联系地址</p></div><div><Input placeholder="未填写时可留空" aria-invalid={Boolean(errors.address)} {...register("address")} /><FieldError message={errors.address?.message} /></div></label>
    </div></section>
    <section className="patient-form-section"><div className="patient-form-section-heading"><span>医疗背景</span><h2>既往病史与过敏信息</h2><p>如无可靠记录请留空，不推测或补造医疗信息。</p></div><div className="patient-form-fields">
      <label><div><span>既往病史</span><p>已确诊疾病、手术或长期治疗情况</p></div><div><textarea rows={5} placeholder="未记录时可留空" aria-invalid={Boolean(errors.medicalHistory)} {...register("medicalHistory")} /><FieldError message={errors.medicalHistory?.message} /></div></label>
      <label><div><span>过敏史</span><p>药物、食物或其他明确过敏信息</p></div><div><textarea rows={5} placeholder="未记录时可留空" aria-invalid={Boolean(errors.allergyHistory)} {...register("allergyHistory")} /><FieldError message={errors.allergyHistory?.message} /></div></label>
    </div></section>
  </>;
}
