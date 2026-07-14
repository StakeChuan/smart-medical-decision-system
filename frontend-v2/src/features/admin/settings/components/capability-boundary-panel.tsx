import { Clock3, LockKeyhole, SlidersHorizontal } from "lucide-react";

const unavailable = [
  { label: "账号创建时间", description: "数据库已有字段，但当前账号接口尚未返回。", icon: Clock3 },
  { label: "最后登录时间", description: "当前数据库和 API 均未提供专用字段。", icon: LockKeyhole },
  { label: "角色与权限配置", description: "当前采用固定 admin / doctor 角色判断，尚未建立 RBAC。", icon: SlidersHorizontal },
];

export function CapabilityBoundaryPanel() {
  return <section className="admin-settings-panel"><div className="admin-settings-panel-heading"><SlidersHorizontal className="h-5 w-5" /><div><h2>能力范围</h2><p>未提供后端能力的项目保持只读说明，不生成无效设置。</p></div></div><div className="admin-settings-capabilities">{unavailable.map(({ label, description, icon: Icon }) => <div key={label}><Icon className="h-4 w-4" /><div><strong>{label}</strong><p>{description}</p></div><span>暂未提供</span></div>)}</div></section>;
}
