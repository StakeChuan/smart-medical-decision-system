import { BrainCircuit, ClipboardPlus, UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { label: "新增患者", description: "建立患者基础档案", icon: UserPlus, to: "/doctor/patients/new", enabled: true },
  { label: "新建问诊", description: "选择患者并录入问诊", icon: ClipboardPlus, to: "/doctor/consultations/new", enabled: true },
  { label: "患者列表", description: "查找患者与历史记录", icon: Users, to: "/doctor/patients", enabled: true },
  { label: "AI 诊断中心", description: "独立入口将在后续开放", icon: BrainCircuit, to: "", enabled: false },
];

export function QuickActions() {
  return <section className="workspace-section" aria-labelledby="quick-actions-title"><div className="section-heading"><div><h2 id="quick-actions-title">快捷操作</h2><p>进入常用临床工作流程</p></div></div><div className="quick-action-list">{actions.map(({ label, description, icon: Icon, to, enabled }) => enabled ? <Link to={to} className="quick-action-row" key={label}><Icon className="h-4 w-4" /><div><strong>{label}</strong><p>{description}</p></div><span>进入</span></Link> : <div className="quick-action-row is-disabled" title="独立入口将在后续开放" key={label}><Icon className="h-4 w-4" /><div><strong>{label}</strong><p>{description}</p></div><span>未开放</span></div>)}</div></section>;
}
