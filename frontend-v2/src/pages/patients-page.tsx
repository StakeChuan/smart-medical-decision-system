import { ClipboardPlus, Search, ShieldAlert, UserPlus, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { PatientListItem } from "@/features/patients/components/patient-list-item";
import { usePatients } from "@/features/patients/queries";

function PatientListSkeleton() {
  return <div className="patient-list" aria-label="正在加载患者列表">{Array.from({ length: 5 }, (_, index) => <div className="patient-list-skeleton" key={index}><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 min-w-0 flex-1" /><Skeleton className="hidden h-10 w-24 sm:block" /><Skeleton className="hidden h-10 w-36 lg:block" /></div>)}</div>;
}

export function PatientsPage() {
  const query = usePatients(); const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("zh-CN");
  const patients = useMemo(() => {
    const all = query.data ?? [];
    if (!normalizedSearch) return all;
    return all.filter((patient) => patient.name.toLocaleLowerCase("zh-CN").includes(normalizedSearch) || String(patient.id).includes(normalizedSearch));
  }, [normalizedSearch, query.data]);
  const forbidden = query.error instanceof ApiError && query.error.code === "FORBIDDEN";

  return <div className="mx-auto max-w-[1440px]">
    <PageHeader eyebrow="患者管理" title="患者列表" description="查找患者并进入其问诊时间线与 AI 报告。" actions={<><div className="text-sm text-muted">{query.data ? `共 ${query.data.length} 位患者` : "正在获取患者"}</div><Button asChild variant="secondary" size="sm"><Link to="/doctor/consultations/new"><ClipboardPlus className="h-4 w-4" />新建问诊</Link></Button><Button asChild size="sm"><Link to="/doctor/patients/new"><UserPlus className="h-4 w-4" />新增患者</Link></Button></>} />
    <section className="patient-directory">
      <div className="patient-directory-toolbar"><div><h2>全部患者</h2><p>仅显示当前医生有权查看的患者资料</p></div><label className="patient-search"><Search className="h-4 w-4" /><span className="sr-only">搜索患者</span><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名或患者 ID" aria-label="搜索患者" />{search && <Button variant="ghost" size="icon" aria-label="清除搜索" onClick={() => setSearch("")}><X className="h-4 w-4" /></Button>}</label></div>
      {query.isLoading && <PatientListSkeleton />}
      {query.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>无权查看患者列表</strong><p>当前账号没有患者管理权限，请联系管理员确认医生账号权限。</p></div>}
      {query.isError && !forbidden && <ErrorState message={query.error instanceof Error ? query.error.message : "患者列表暂时不可用"} onRetry={() => query.refetch()} />}
      {query.data && query.data.length === 0 && <EmptyState title="暂无患者" description="当前账号下还没有患者记录。" />}
      {query.data && query.data.length > 0 && patients.length === 0 && <div className="search-empty"><Users className="h-6 w-6 text-muted" /><strong>没有匹配的患者</strong><p>请尝试输入完整姓名、姓名关键字或患者编号。</p><Button variant="secondary" size="sm" onClick={() => setSearch("")}>清除搜索</Button></div>}
      {patients.length > 0 && <div className="patient-list">{patients.map((patient) => <PatientListItem patient={patient} key={patient.id} />)}</div>}
    </section>
  </div>;
}
