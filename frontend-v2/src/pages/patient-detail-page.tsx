import { ArrowLeft, ClipboardPlus } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MedicalTimeline } from "@/components/medical/medical-timeline";
import { PatientHeader } from "@/components/medical/patient-header";
import { PatientProfileSummary } from "@/components/medical/patient-profile-summary";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { usePatientConsultations } from "@/features/consultations/queries";
import { usePatient } from "@/features/patients/queries";

export function PatientDetailPage() {
  const patientId = Number(useParams().patientId);
  const patientQuery = usePatient(patientId);
  const consultationsQuery = usePatientConsultations(patientId);
  const isLoading = patientQuery.isLoading || consultationsQuery.isLoading;
  const error = patientQuery.error || consultationsQuery.error;

  if (!Number.isInteger(patientId) || patientId <= 0) return <ErrorState message="患者编号无效，请返回工作台重新选择患者。" />;
  if (isLoading) return <div className="mx-auto max-w-[1440px] space-y-5"><Skeleton className="h-40" /><div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]"><Skeleton className="h-72" /><Skeleton className="h-[480px]" /></div></div>;
  if (error) return <div className="mx-auto max-w-[1440px]"><ErrorState message={error instanceof Error ? error.message : "患者资料暂时不可用"} onRetry={() => { void patientQuery.refetch(); void consultationsQuery.refetch(); }} /></div>;
  if (!patientQuery.data) return <div className="mx-auto max-w-[1440px]"><ErrorState message="未找到该患者，患者可能已被删除或当前账号无权查看。" /></div>;

  const consultations = consultationsQuery.data ?? [];
  return <div className="mx-auto max-w-[1440px]">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost" size="sm" className="px-0"><Link to="/doctor/patients"><ArrowLeft className="h-4 w-4" />返回患者列表</Link></Button><Button asChild size="sm"><Link to={`/doctor/consultations/new?patientId=${patientId}`}><ClipboardPlus className="h-4 w-4" />新建问诊</Link></Button></div>
    <PatientHeader patient={patientQuery.data} consultationCount={consultations.length} />
    <div className="patient-detail-grid"><PatientProfileSummary patient={patientQuery.data} /><MedicalTimeline consultations={consultations} /></div>
  </div>;
}
