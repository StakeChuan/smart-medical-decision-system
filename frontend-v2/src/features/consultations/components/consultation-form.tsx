import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { CreateConsultationInput } from "@/types/consultation";
import { ConsultationFieldGroup } from "./consultation-field-group";
import { ConsultationSubmitBar } from "./consultation-submit-bar";

const optionalClinicalText = z.string().trim().max(2000, "内容不能超过 2000 字");
const schema = z.object({ chiefComplaint: z.string().trim().min(2, "请至少填写 2 个字的主诉").max(1000, "主诉不能超过 1000 字"), symptoms: optionalClinicalText, presentIllness: optionalClinicalText, pastHistory: optionalClinicalText, examination: optionalClinicalText });
type FormValues = z.infer<typeof schema>;

export function ConsultationForm({ patientId, isSubmitting, serverError, onSubmit }: { patientId: number | null; isSubmitting: boolean; serverError: string; onSubmit: (input: CreateConsultationInput) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { chiefComplaint: "", symptoms: "", presentIllness: "", pastHistory: "", examination: "" } });
  const submit = (values: FormValues) => patientId ? onSubmit({ patientId, chiefComplaint: values.chiefComplaint, symptoms: values.symptoms || null, presentIllness: values.presentIllness || null, pastHistory: values.pastHistory || null, examination: values.examination || null }) : Promise.resolve();
  return <form className="consultation-form" onSubmit={handleSubmit(submit)} noValidate><section className="consultation-panel"><div className="consultation-panel-heading"><div><span>第二步</span><h2>填写问诊信息</h2><p>记录医生已确认的临床信息，缺失项目可以暂不填写。</p></div></div><div className="consultation-fields"><ConsultationFieldGroup label="主诉" description="患者本次就诊最主要的问题" required rows={3} placeholder="例如：发热、咳嗽三天" error={errors.chiefComplaint?.message} {...register("chiefComplaint")} /><ConsultationFieldGroup label="症状" description="当前可观察或患者描述的症状" rows={3} placeholder="记录症状、持续时间与变化" error={errors.symptoms?.message} {...register("symptoms")} /><ConsultationFieldGroup label="现病史" description="本次疾病发生、发展与处理经过" rows={4} placeholder="未记录时可留空" error={errors.presentIllness?.message} {...register("presentIllness")} /><ConsultationFieldGroup label="既往史" description="与当前判断相关的既往疾病或治疗" rows={3} placeholder="未记录时可留空" error={errors.pastHistory?.message} {...register("pastHistory")} /><ConsultationFieldGroup label="检查结果" description="体格检查、检验或影像检查结果" rows={4} placeholder="未记录时可留空" error={errors.examination?.message} {...register("examination")} /></div></section>{serverError && <div className="consultation-error" role="alert">{serverError}</div>}<ConsultationSubmitBar disabled={!patientId} isSubmitting={isSubmitting} /></form>;
}
