import type { MessageCategory } from "../types";

const tabs: Array<{ value: MessageCategory; label: string }> = [
  { value: "pending", label: "待处理" },
  { value: "reviewed", label: "本会话已查看" },
  { value: "system", label: "系统消息" },
];

export function MessageCategoryTabs({ value, onChange, pendingCount, reviewedCount }: { value: MessageCategory; onChange: (value: MessageCategory) => void; pendingCount: number; reviewedCount: number }) {
  return <div className="message-tabs" role="tablist" aria-label="提醒分类">{tabs.map((tab) => { const count = tab.value === "pending" ? pendingCount : tab.value === "reviewed" ? reviewedCount : null; return <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)}>{tab.label}{count !== null && <span>{count}</span>}</button>; })}</div>;
}
