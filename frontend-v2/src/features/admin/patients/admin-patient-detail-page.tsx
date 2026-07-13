import { ArrowLeft, RefreshCw, ShieldAlert, UserRoundX } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useAdminDoctors } from "@/features/admin/doctors/queries";
import { isValidEntityId } from "@/lib/queryKeys";
import { PatientDetail } from "./components/patient-detail";
import { PatientMedicalOverview } from "./components/patient-medical-overview";
import { useAdminPatient, useAdminPatientConsultations } from "./queries";

export function AdminPatientDetailPage() {
  const params = useParams();
  const patientId = Number(params.patientId);
  const validId = isValidEntityId(patientId);
  const patientQuery = useAdminPatient(patientId);
  const consultationsQuery = useAdminPatientConsultations(patientId, patientQuery.isSuccess);
  const doctorsQuery = useAdminDoctors("");
  const forbidden = patientQuery.error instanceof ApiError && patientQuery.error.code === "FORBIDDEN";
  const notFound = patientQuery.error instanceof ApiError && patientQuery.error.code === "NOT_FOUND";
  const refreshing = patientQuery.isFetching || consultationsQuery.isFetching;
  if (!validId) return <PatientNotFound message="患者 ID 格式无效，请返回患者列表重新选择。" />;
  const doctor = patientQuery.data?.doctorId == null ? undefined : doctorsQuery.data?.find((item) => item.id === patientQuery.data?.doctorId);
  return <div className="mx-auto max-w-[1200px]"><PageHeader eyebrow="系统管理 / 患者管理 / 详情" title={patientQuery.data?.name || "患者详情"} description="查看患者档案、归属信息与只读医疗概览。" actions={<><Button asChild variant="ghost" size="sm"><Link to="/admin/patients"><ArrowLeft className="h-4 w-4" />返回列表</Link></Button><Button variant="secondary" size="sm" disabled={refreshing} onClick={() => { void patientQuery.refetch(); if (consultationsQuery.isEnabled) void consultationsQuery.refetch(); }}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />刷新</Button></>} />
    {patientQuery.isLoading && <div className="space-y-5" aria-label="正在加载患者详情"><Skeleton className="h-52" /><Skeleton className="h-64" /></div>}
    {patientQuery.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问患者管理</strong><p>后端拒绝了当前管理员会话，请重新登录或检查账号状态。</p></div>}
    {patientQuery.isError && notFound && <PatientNotFound message={`没有找到 ID 为 ${patientId} 的患者记录。`} />}
    {patientQuery.isError && !forbidden && !notFound && <ErrorState message={patientQuery.error instanceof Error ? patientQuery.error.message : "患者详情暂时不可用"} onRetry={() => void patientQuery.refetch()} />}
    {patientQuery.data && <div className="space-y-5"><PatientDetail patient={patientQuery.data} doctor={doctor} /><PatientMedicalOverview consultations={consultationsQuery.data} isLoading={consultationsQuery.isLoading} error={consultationsQuery.error instanceof Error ? consultationsQuery.error : null} onRetry={() => void consultationsQuery.refetch()} /><section className="workspace-section"><div className="section-heading"><div><h2>医疗背景</h2><p>原始患者档案中的只读医疗信息</p></div></div><div className="admin-patient-medical-fields"><div><span>既往病史</span><p>{patientQuery.data.medicalHistory || "暂未提供"}</p></div><div><span>过敏史</span><p>{patientQuery.data.allergyHistory || "暂未提供"}</p></div></div></section></div>}
  </div>;
}

function PatientNotFound({ message }: { message: string }) { return <div className="admin-doctor-not-found"><UserRoundX className="h-7 w-7 text-muted" /><strong>患者不存在</strong><p>{message}</p><Button asChild><Link to="/admin/patients">返回患者列表</Link></Button></div>; }
