import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export function AiManagementHeader({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return <PageHeader eyebrow="系统管理 / AI 管理中心" title="AI 辅助决策管理中心" description="查看系统已有的 AI 报告记录与生成审计信息；本页面用于系统可观测性，不参与临床诊断。" actions={<Button variant="secondary" size="sm" disabled={refreshing} onClick={onRefresh}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />刷新数据</Button>} />;
}
