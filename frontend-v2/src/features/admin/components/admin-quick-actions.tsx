import { BrainCircuit, FileClock, Settings, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { label: "医生管理", target: "/admin/doctors", description: "医生账号、状态与使用情况", icon: Stethoscope, enabled: true },
  { label: "患者管理", target: "/admin/patients", description: "全院患者档案与归属关系", icon: Users, enabled: true },
  { label: "AI 管理中心", target: "/admin/ai", description: "AI 报告记录与生成审计", icon: BrainCircuit, enabled: true },
  { label: "操作日志", target: "/admin/logs", description: "系统操作与安全审计记录", icon: FileClock, enabled: true },
  { label: "系统设置", target: "/admin/settings", description: "管理员账号与系统连接状态", icon: Settings, enabled: true },
];

export function AdminQuickActions() {
  return <section className="workspace-section"><div className="section-heading"><div><h2>管理入口</h2><p>系统管理功能入口</p></div></div><div className="quick-action-list">{actions.map(({ label, target, description, icon: Icon, enabled }) => enabled ? <Link className="quick-action-row" to={target} key={target}><Icon className="h-4 w-4" /><div><strong>{label}</strong><p>{description}</p></div><span>进入</span></Link> : <div className="quick-action-row is-disabled" title={`${target} 即将开放`} key={target}><Icon className="h-4 w-4" /><div><strong>{label}</strong><p>{description}</p></div><span>即将开放</span></div>)}</div></section>;
}
