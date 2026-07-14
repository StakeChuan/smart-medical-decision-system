import { Search, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface LogFilterValue {
  keyword: string;
  module: string;
  action: string;
}

export function LogFilter({ value, disabled, onApply, onReset }: { value: LogFilterValue; disabled: boolean; onApply: (value: LogFilterValue) => void; onReset: () => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const submit = (event: FormEvent) => { event.preventDefault(); onApply({ keyword: draft.keyword.trim(), module: draft.module.trim(), action: draft.action.trim() }); };
  return <div className="admin-log-filter"><form onSubmit={submit}><label><span>关键词</span><Input value={draft.keyword} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} placeholder="用户名、详情或对象 ID" /></label><label><span>模块</span><Input value={draft.module} onChange={(event) => setDraft((current) => ({ ...current, module: event.target.value }))} placeholder="精确模块名称" /></label><label><span>操作</span><Input value={draft.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))} placeholder="精确操作名称" /></label><div className="admin-log-filter-actions"><Button type="submit" disabled={disabled}><Search className="h-4 w-4" />查询</Button><Button type="button" variant="ghost" disabled={disabled} onClick={() => { setDraft({ keyword: "", module: "", action: "" }); onReset(); }}><X className="h-4 w-4" />重置</Button></div></form><p>当前接口支持关键词、模块和操作筛选；角色与时间范围暂未提供。</p></div>;
}
