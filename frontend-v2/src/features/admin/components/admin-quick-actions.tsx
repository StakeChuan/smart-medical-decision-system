import { FileClock, Settings, Stethoscope, Users } from "lucide-react";

const actions = [
  { label: "医生管理", target: "/admin/doctors", description: "医生账号、状态与使用情况", icon: Stethoscope },
  { label: "患者管理", target: "/admin/patients", description: "全院患者档案与归属关系", icon: Users },
  { label: "操作日志", target: "/admin/logs", description: "系统操作与安全审计记录", icon: FileClock },
  { label: "系统设置", target: "/admin/settings", description: "系统参数与账号安全配置", icon: Settings },
];

export function AdminQuickActions() {
  return <section className="workspace-section"><div className="section-heading"><div><h2>管理入口</h2><p>后续管理员模块规划</p></div></div><div className="quick-action-list">{actions.map(({ label, target, description, icon: Icon }) => <div className="quick-action-row is-disabled" title={`${target} 即将开放`} key={target}><Icon className="h-4 w-4" /><div><strong>{label}</strong><p>{description}</p></div><span>即将开放</span></div>)}</div></section>;
}
