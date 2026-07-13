import { CheckCircle2, Clock3, Stethoscope } from "lucide-react";

const items = [
  { key: "recent", label: "近期问诊", detail: "Dashboard 最近返回记录", icon: Stethoscope },
  { key: "pending", label: "待分析问诊", detail: "尚未生成辅助报告", icon: Clock3 },
  { key: "completed", label: "已完成报告", detail: "可进入报告页审核", icon: CheckCircle2 },
] as const;

export function AiCenterSummary({ recent, pending, completed }: { recent: number; pending: number; completed: number }) {
  const values = { recent, pending, completed };
  return <section className="ai-center-summary" aria-label="AI 辅助分析摘要">{items.map(({ key, label, detail, icon: Icon }) => <div key={key}><div><span>{label}</span><Icon className="h-4 w-4" /></div><strong>{values[key]}</strong><p>{detail}</p></div>)}</section>;
}
