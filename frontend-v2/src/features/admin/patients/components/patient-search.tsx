import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PatientSearch({ onLookup }: { onLookup: (patientId: number) => void }) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const patientId = Number(value);
    if (Number.isInteger(patientId) && patientId > 0) onLookup(patientId);
  };
  return <div className="admin-patient-search-panel"><form onSubmit={submit}><Search className="h-4 w-4 text-muted" /><Input inputMode="numeric" min="1" pattern="[0-9]+" placeholder="输入患者 ID 直接查询" value={value} onChange={(event) => setValue(event.target.value)} aria-label="患者 ID" /><Button type="submit" variant="secondary" disabled={!/^\d+$/.test(value) || Number(value) < 1}>查询</Button></form><p>当前接口未提供患者姓名搜索，系统不会在浏览器中扫描全部患者模拟搜索。</p></div>;
}
