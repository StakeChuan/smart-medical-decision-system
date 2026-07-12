import { Badge } from "@/components/ui/badge";
import type { AiReport } from "@/types/report";

export function ReportStatus({ report }: { report: AiReport | null }) {
  return report ? <Badge tone="success">AI 报告已生成</Badge> : <Badge tone="warning">AI 报告待生成</Badge>;
}
