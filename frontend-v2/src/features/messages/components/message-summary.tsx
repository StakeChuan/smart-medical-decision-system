import { BellDot, BrainCircuit, CheckCheck, ShieldAlert } from "lucide-react";

const items = [
  { key: "pending", label: "待查看", icon: BellDot },
  { key: "analysis", label: "待辅助分析", icon: BrainCircuit },
  { key: "risk", label: "待审核风险", icon: ShieldAlert },
  { key: "reviewed", label: "本会话已查看", icon: CheckCheck },
] as const;

export function MessageSummary({ pending, analysis, risk, reviewed }: { pending: number; analysis: number; risk: number; reviewed: number }) {
  const values = { pending, analysis, risk, reviewed };
  return <section className="message-summary" aria-label="行动提醒摘要">{items.map(({ key, label, icon: Icon }) => <div key={key}><div><span>{label}</span><Icon className="h-4 w-4" /></div><strong>{values[key]}</strong></div>)}</section>;
}
