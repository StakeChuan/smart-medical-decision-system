import { Bot, KeyRound, ServerCog } from "lucide-react";

const capabilities = [
  { label: "AI 服务状态", description: "当前接口无法验证模型服务是否在线；数据库健康状态不能替代 AI 服务状态。", icon: ServerCog },
  { label: "模型名称", description: "模型配置未通过管理员只读接口公开。", icon: Bot },
  { label: "API 连接状态", description: "当前后端未提供不触发生成行为的 AI 连接检测接口。", icon: KeyRound },
];

export function AiServiceStatus() {
  return <section className="admin-ai-panel"><div className="admin-ai-panel-heading"><ServerCog className="h-5 w-5" /><div><h2>AI 服务状态</h2><p>仅展示后端能够直接证实的运行信息。</p></div></div><div className="admin-ai-capability-list">{capabilities.map(({ label, description, icon: Icon }) => <div key={label}><Icon className="h-4 w-4" /><div><strong>{label}</strong><p>{description}</p></div><span>当前后端暂未提供</span></div>)}</div></section>;
}
