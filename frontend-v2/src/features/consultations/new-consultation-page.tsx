import { AlertTriangle, ArrowLeft, ShieldAlert, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useCreateConsultation } from "@/features/consultations/mutations";
import { ConsultationForm } from "@/features/consultations/components/consultation-form";
import { PatientSelector } from "@/features/consultations/components/patient-selector";
import { usePatient, usePatients } from "@/features/patients/queries";
import type { CreateConsultationInput } from "@/types/consultation";
import type { Patient } from "@/types/patient";

function SelectedPatientContext({ patient }: { patient: Patient }) { return <section className="selected-patient-context"><div className="patient-avatar h-12 w-12"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><span>当前患者</span><h2>{patient.name || "未命名患者"}</h2><p>{[patient.gender, patient.age == null ? null : `${patient.age} 岁`, `患者 #${patient.id}`].filter(Boolean).join(" · ")}</p></div>{patient.allergyHistory ? <Badge tone="danger"><AlertTriangle className="mr-1 h-3.5 w-3.5" />有过敏史</Badge> : <Badge>过敏史未记录</Badge>}</section>; }

export function NewConsultationPage() {
  const [params] = useSearchParams(); const boundPatientId = Number(params.get("patientId")); const hasBoundPatient = Number.isInteger(boundPatientId) && boundPatientId > 0;
  const boundPatientQuery = usePatient(hasBoundPatient ? boundPatientId : 0); const patientsQuery = usePatients();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null); const creation = useCreateConsultation(); const navigate = useNavigate();
  const patient = hasBoundPatient ? boundPatientQuery.data ?? null : selectedPatient;
  const loadError = hasBoundPatient ? boundPatientQuery.error : patientsQuery.error;
  const forbidden = loadError instanceof ApiError && loadError.code === "FORBIDDEN";
  async function submit(input: CreateConsultationInput) { creation.reset(); try { const consultation = await creation.submit(input); navigate(`/doctor/patients/${consultation.patientId}/consultations/${consultation.id}/diagnosis`); } catch { /* Mutation error is rendered in the form. */ } }

  if (hasBoundPatient && boundPatientQuery.isLoading) return <div className="mx-auto max-w-[1200px] space-y-5"><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;
  if (loadError && forbidden) return <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>无权创建该患者的问诊</strong><p>当前账号没有患者问诊权限，请联系管理员确认医生账号权限。</p></div>;
  if (loadError) return <ErrorState message={loadError instanceof Error ? loadError.message : "患者资料暂时不可用"} onRetry={() => hasBoundPatient ? void boundPatientQuery.refetch() : void patientsQuery.refetch()} />;
  if (hasBoundPatient && !boundPatientQuery.data) return <ErrorState message="患者不存在或已被删除，请返回患者列表重新选择。" />;

  return <div className="mx-auto max-w-[1200px]"><PageHeader eyebrow="问诊工作流" title="新建问诊" description="选择患者并记录本次临床信息，提交后进入 AI 辅助诊断工作区。" actions={<Button asChild variant="ghost" size="sm"><Link to={patient ? `/doctor/patients/${patient.id}` : "/doctor/patients"}><ArrowLeft className="h-4 w-4" />取消并返回</Link></Button>} />
    {!hasBoundPatient && <PatientSelector patients={patientsQuery.data ?? []} selectedId={selectedPatient?.id ?? null} isLoading={patientsQuery.isLoading} onSelect={setSelectedPatient} />}
    {patient ? <><SelectedPatientContext patient={patient} /><ConsultationForm patientId={patient.id} isSubmitting={creation.isPending} serverError={creation.error?.message || ""} onSubmit={submit} /></> : !patientsQuery.isLoading && <div className="consultation-selection-notice"><UserRound className="h-5 w-5" /><div><strong>请先选择患者</strong><p>选择患者后将显示问诊信息填写区域。</p></div></div>}
  </div>;
}
