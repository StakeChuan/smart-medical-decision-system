import type { OperationLog } from "../types";

function display(value: string | number | null) { return value == null || value === "" ? "暂未提供" : String(value); }

export function OperationLogDetail({ log }: { log: OperationLog }) {
  return <details className="admin-log-detail"><summary>查看详情</summary><div><div><span>完整操作内容</span><p>{display(log.detail)}</p></div><dl><div><dt>日志 ID</dt><dd>{log.id}</dd></div><div><dt>用户 ID</dt><dd>{display(log.userId)}</dd></div><div><dt>对象类型</dt><dd>{display(log.targetType)}</dd></div><div><dt>对象 ID</dt><dd>{display(log.targetId)}</dd></div></dl></div></details>;
}
