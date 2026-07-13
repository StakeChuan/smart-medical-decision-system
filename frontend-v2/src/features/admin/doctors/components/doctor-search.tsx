import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DoctorSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="admin-doctor-search"><Search className="h-4 w-4" /><span className="sr-only">搜索医生</span><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="搜索医生姓名或用户名" />{value && <Button type="button" variant="ghost" size="icon" aria-label="清除医生搜索" onClick={() => onChange("")}><X className="h-4 w-4" /></Button>}</label>;
}
