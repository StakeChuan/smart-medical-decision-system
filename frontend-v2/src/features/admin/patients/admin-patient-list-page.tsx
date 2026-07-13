import { RefreshCw, ShieldAlert } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useAdminDoctors } from "@/features/admin/doctors/queries";
import { PatientDoctorFilter } from "./components/patient-doctor-filter";
import { PatientSearch } from "./components/patient-search";
import { PatientTable } from "./components/patient-table";
import { useAdminPatients } from "./queries";

function PatientListSkeleton() {
  return <div className="workspace-section" aria-label="正在加载患者列表"><Skeleton className="h-28" />{[1,2,3,4,5].map((item) => <div className="border-t border-border p-4" key={item}><Skeleton className="h-16" /></div>)}</div>;
}

export function AdminPatientListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawDoctorId = searchParams.get("doctorId");
  const parsedDoctorId = rawDoctorId ? Number(rawDoctorId) : null;
  const doctorId = parsedDoctorId != null && Number.isInteger(parsedDoctorId) && parsedDoctorId > 0 ? parsedDoctorId : null;
  const patientQuery = useAdminPatients(doctorId);
  const doctorQuery = useAdminDoctors("");
  const forbidden = patientQuery.error instanceof ApiError && patientQuery.error.code === "FORBIDDEN";
  const changeDoctor = (value: number | null) => setSearchParams(value == null ? {} : { doctorId: String(value) });
  return <div className="mx-auto max-w-[1440px]"><PageHeader eyebrow="系统管理 / 患者管理" title="患者管理" description="查看全局患者档案、归属关系与只读医疗概览。" actions={<Button variant="secondary" size="sm" disabled={patientQuery.isFetching} onClick={() => void patientQuery.refetch()}><RefreshCw className={`h-4 w-4 ${patientQuery.isFetching ? "animate-spin" : ""}`} />刷新</Button>} />
    {patientQuery.isLoading && <PatientListSkeleton />}
    {patientQuery.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问患者管理</strong><p>后端拒绝了当前管理员会话，请重新登录或检查账号状态。</p></div>}
    {patientQuery.isError && !forbidden && <ErrorState message={patientQuery.error instanceof Error ? patientQuery.error.message : "患者列表暂时不可用"} onRetry={() => void patientQuery.refetch()} />}
    {patientQuery.data && <section className="workspace-section"><div className="admin-patient-toolbar"><div><h2>患者列表</h2><p>{doctorId == null ? `共返回 ${patientQuery.data.length} 名患者` : `当前医生名下 ${patientQuery.data.length} 名患者`}</p></div><PatientDoctorFilter doctors={doctorQuery.data ?? []} value={doctorId} onChange={changeDoctor} disabled={doctorQuery.isLoading || doctorQuery.isError} /></div><PatientSearch onLookup={(patientId) => navigate(`/admin/patients/${patientId}`)} />{doctorQuery.isError && <div className="admin-patient-partial-note">医生信息暂时不可用，患者列表仍可查看；归属医生将显示账号 ID。</div>}{patientQuery.data.length ? <PatientTable patients={patientQuery.data} doctors={doctorQuery.data ?? []} /> : <EmptyState title={doctorId == null ? "暂无患者数据" : "该医生暂无患者"} description={doctorId == null ? "当前接口没有返回患者记录。" : "当前医生筛选条件下没有患者记录。"} />}</section>}
  </div>;
}
