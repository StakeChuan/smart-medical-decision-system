import { ArrowLeft, ShieldAlert, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PatientForm } from "@/features/patients/components/patient-form";
import { useCreatePatient } from "@/features/patients/mutations";
import type { CreatePatientInput } from "@/types/patient";

export function NewPatientPage() {
  const creation = useCreatePatient(); const navigate = useNavigate();
  const forbidden = creation.error instanceof ApiError && creation.error.code === "FORBIDDEN";
  async function submit(input: CreatePatientInput) { creation.reset(); try { const patient = await creation.submit(input); navigate(`/doctor/patients/${patient.id}`); } catch { /* Mutation state is rendered below. */ } }
  const errorMessage = forbidden ? "当前账号无权新增患者，请联系管理员确认医生账号权限。" : creation.error?.message || "";
  return <div className="mx-auto max-w-[1200px]"><PageHeader eyebrow="患者管理" title="新增患者" description="建立患者基础档案和医疗背景信息，创建后进入患者详情。" actions={<Button asChild variant="ghost" size="sm"><Link to="/doctor/patients"><ArrowLeft className="h-4 w-4" />取消并返回</Link></Button>} /><div className="patient-create-intro"><UserPlus className="h-5 w-5" /><div><strong>新患者档案</strong><p>请仅录入已经确认的信息，医疗背景不明确时保持空白。</p></div>{forbidden && <ShieldAlert className="ml-auto h-5 w-5 text-warning" />}</div><PatientForm isSubmitting={creation.isPending} serverError={errorMessage} onSubmit={submit} /></div>;
}
