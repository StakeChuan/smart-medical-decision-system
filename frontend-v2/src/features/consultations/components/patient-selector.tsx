import { AlertTriangle, Check, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/states";
import type { Patient } from "@/types/patient";

export function PatientSelector({ patients, selectedId, isLoading, onSelect }: { patients: Patient[]; selectedId: number | null; isLoading: boolean; onSelect: (patient: Patient) => void }) {
  const [search, setSearch] = useState(""); const term = search.trim().toLocaleLowerCase("zh-CN");
  const filtered = useMemo(() => term ? patients.filter((patient) => patient.name.toLocaleLowerCase("zh-CN").includes(term) || String(patient.id).includes(term)) : patients, [patients, term]);
  return <section className="consultation-panel" aria-labelledby="patient-selector-title"><div className="consultation-panel-heading"><div><span>第一步</span><h2 id="patient-selector-title">选择患者</h2><p>选择本次问诊对应的患者，提交后不可更改。</p></div><label className="patient-search"><Search className="h-4 w-4" /><span className="sr-only">搜索问诊患者</span><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="姓名或患者 ID" aria-label="搜索问诊患者" /></label></div>
    {isLoading && <div className="patient-choice-list">{[1,2,3].map((item) => <div className="patient-choice" key={item}><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 flex-1" /></div>)}</div>}
    {!isLoading && patients.length === 0 && <EmptyState title="暂无可选患者" description="当前账号下没有可用于创建问诊的患者。" />}
    {!isLoading && patients.length > 0 && filtered.length === 0 && <EmptyState title="没有匹配患者" description="请修改姓名或患者 ID 后重试。" />}
    {filtered.length > 0 && <div className="patient-choice-list">{filtered.map((patient) => <button type="button" className="patient-choice" data-selected={selectedId === patient.id} key={patient.id} onClick={() => onSelect(patient)}><div className="avatar h-10 w-10"><UserRound className="h-4 w-4" /></div><div className="min-w-0 flex-1 text-left"><strong>{patient.name || "未命名患者"}</strong><p>{[patient.gender, patient.age == null ? null : `${patient.age} 岁`, `患者 #${patient.id}`].filter(Boolean).join(" · ")}</p></div>{patient.allergyHistory && <Badge tone="danger"><AlertTriangle className="mr-1 h-3.5 w-3.5" />有过敏史</Badge>}{selectedId === patient.id ? <Check className="h-5 w-5 text-primary" /> : <span className="patient-choice-action">选择</span>}</button>)}</div>}
  </section>;
}
