import { Badge } from "@/components/ui/badge";
import type { AiCenterRecord } from "../types";

export function RiskStatusBadge({ record }: { record: AiCenterRecord }) {
  const tone = !record.hasAiReport || record.riskLabel === "加载中" || record.riskLabel === "暂不可用" || record.riskLabel === "未提供" ? "neutral" : record.riskLevel === "high" ? "danger" : record.riskLevel === "medium" ? "warning" : record.riskLevel === "low" ? "success" : "neutral";
  return <Badge tone={tone}>风险：{record.riskLabel}</Badge>;
}
