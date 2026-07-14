import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export function OperationLogHeader({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return <PageHeader eyebrow="系统管理 / 操作日志" title="系统操作日志" description="查看系统用户操作记录和安全审计信息。" actions={<Button variant="secondary" size="sm" disabled={refreshing} onClick={onRefresh}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />刷新</Button>} />;
}
