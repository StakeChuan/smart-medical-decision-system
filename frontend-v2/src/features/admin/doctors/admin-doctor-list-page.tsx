import { RefreshCw, ShieldAlert, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { DoctorSearch } from "./components/doctor-search";
import { DoctorTable } from "./components/doctor-table";
import { useAdminDoctors } from "./queries";

function DoctorListSkeleton() {
  return <div className="workspace-section" aria-label="正在加载医生列表"><Skeleton className="h-20" />{[1,2,3,4,5].map((item) => <div className="border-t border-border p-4" key={item}><Skeleton className="h-16" /></div>)}</div>;
}

export function AdminDoctorListPage() {
  const [search, setSearch] = useState(""); const [keyword, setKeyword] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setKeyword(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  const query = useAdminDoctors(keyword); const forbidden = query.error instanceof ApiError && query.error.code === "FORBIDDEN";
  return <div className="mx-auto max-w-[1440px]"><PageHeader eyebrow="系统管理 / 医生管理" title="医生管理" description="查看系统内医生账号状态与真实工作数据。" actions={<Button variant="secondary" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />刷新</Button>} />
    {query.isLoading && <DoctorListSkeleton />}
    {query.isError && forbidden && <div className="permission-state"><ShieldAlert className="h-7 w-7 text-warning" /><strong>暂无权限访问医生管理</strong><p>后端拒绝了当前管理员会话，请重新登录或检查账号状态。</p></div>}
    {query.isError && !forbidden && <ErrorState message={query.error instanceof Error ? query.error.message : "医生列表暂时不可用"} onRetry={() => void query.refetch()} />}
    {query.data && <section className="workspace-section"><div className="admin-doctor-toolbar"><div><h2>医生列表</h2><p>{keyword ? `“${keyword}”的搜索结果` : `共返回 ${query.data.length} 名医生`}</p></div><DoctorSearch value={search} onChange={setSearch} /></div>{query.data.length ? <DoctorTable doctors={query.data} /> : keyword ? <div className="search-empty"><Stethoscope className="h-6 w-6 text-muted" /><strong>未找到匹配医生</strong><p>请检查医生姓名或用户名后重新搜索。</p><Button variant="secondary" onClick={() => setSearch("")}>清除搜索</Button></div> : <EmptyState title="暂无医生数据" description="当前接口没有返回医生记录。" />}</section>}
  </div>;
}
