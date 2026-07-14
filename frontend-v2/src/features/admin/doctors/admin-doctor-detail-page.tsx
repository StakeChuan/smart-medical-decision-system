import { ArrowLeft, RefreshCw, ShieldAlert, Stethoscope } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { isValidEntityId } from "@/lib/queryKeys";
import { DoctorDetail } from "./components/doctor-detail";
import { DoctorPatientPreview } from "./components/doctor-patient-preview";
import { DoctorSecurityPanel } from "./components/doctor-security-panel";
import { DoctorStats } from "./components/doctor-stats";
import { useAdminDoctor, useAdminDoctorPatients } from "./queries";

export function AdminDoctorDetailPage() {
  const params = useParams(); const doctorId = Number(params.doctorId); const validId = isValidEntityId(doctorId);
  const doctorQuery = useAdminDoctor(doctorId); const patientsQuery = useAdminDoctorPatients(doctorId, doctorQuery.isSuccess && Boolean(doctorQuery.data));
  const refreshing = doctorQuery.isFetching || patientsQuery.isFetching;
  const forbidden = doctorQuery.error instanceof ApiError && doctorQuery.error.code === "FORBIDDEN";
  if (!validId) return <div className="mx-auto max-w-[1200px]"><div className="admin-doctor-not-found"><Stethoscope className="h-7 w-7 text-muted" /><strong>医生不存在</strong><p>医生 ID 格式无效，请返回医生列表重新选择。</p><Button asChild><Link to="/admin/doctors">返回医生列表</Link></Button></div></div>;
  return <div className="mx-auto max-w-[1200px]"><PageHeader eyebrow="系统管理 / 医生管理 / 详情" title={doctorQuery.data ? doctorQuery.data.realName || doctorQuery.data.username : "医生详情"} description="查看医生工作数据，并管理医生账号资料与登录安全。" actions={<><Button asChild variant="ghost" size="sm"><Link to="/admin/doctors"><ArrowLeft className="h-4 w-4" />返回列表</Link></Button><Button variant="secondary" size="sm" disabled={refreshing} onClick={() => { void doctorQuery.refetch(); if (patientsQuery.isEnabled) void patientsQuery.refetch(); }}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />刷新</Button></>} />
    {doctorQuery.isLoading && <div className="space-y-5" aria-label="正在加载医生详情"><Skeleton className="h-48" /><Skeleton className="h-28" /><Skeleton className="h-72" /></div>}
    {doctorQuery.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问医生管理</strong><p>后端拒绝了当前管理员会话，请重新登录或检查账号状态。</p></div>}
    {doctorQuery.isError && !forbidden && <ErrorState message={doctorQuery.error instanceof Error ? doctorQuery.error.message : "医生详情暂时不可用"} onRetry={() => void doctorQuery.refetch()} />}
    {doctorQuery.isSuccess && !doctorQuery.data && <div className="admin-doctor-not-found"><Stethoscope className="h-7 w-7 text-muted" /><strong>医生不存在</strong><p>医生列表中没有 ID 为 {doctorId} 的记录。</p><Button asChild><Link to="/admin/doctors">返回医生列表</Link></Button></div>}
    {doctorQuery.data && <div className="space-y-5"><DoctorDetail doctor={doctorQuery.data} /><DoctorStats doctor={doctorQuery.data} /><DoctorSecurityPanel doctor={doctorQuery.data} /><DoctorPatientPreview patients={patientsQuery.data} isLoading={patientsQuery.isLoading} error={patientsQuery.error instanceof Error ? patientsQuery.error : null} onRetry={() => void patientsQuery.refetch()} /></div>}
  </div>;
}
