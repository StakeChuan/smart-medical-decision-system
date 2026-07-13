import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";

export function AiCenterHeader({ doctorName, actions }: { doctorName: string; actions: ReactNode }) {
  return <><PageHeader eyebrow="AI 辅助决策" title="AI 辅助决策中心" description={`${doctorName}，在这里审核近期问诊的辅助分析状态与报告。`} actions={actions} /><div className="ai-center-notice"><ShieldCheck className="h-5 w-5" /><div><strong>医生审核工具</strong><p>系统输出仅用于辅助临床决策，不能替代医生诊断；所有结果均需结合实际情况审核。</p></div></div></>;
}
