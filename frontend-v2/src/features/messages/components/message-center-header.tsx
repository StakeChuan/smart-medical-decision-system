import { BellRing, ShieldCheck } from "lucide-react";

export function MessageCenterHeader({ doctorName }: { doctorName: string }) {
  return <><header className="page-heading"><div><p className="mb-2 text-xs font-semibold text-primary">临床行动提醒</p><h1 className="text-2xl font-semibold">医生行动提醒中心</h1><p className="mt-2 text-sm text-muted">{doctorName}，查看近期问诊中下一步需要处理的事项。</p></div><div className="message-header-mark"><BellRing className="h-5 w-5" /><span>仅展示近期需要行动的信息</span></div></header><div className="message-center-notice"><ShieldCheck className="h-5 w-5" /><div><strong>医生审核工具</strong><p>提醒内容用于辅助梳理工作，不替代医生诊断与临床判断。完整 AI 辅助分析记录请前往 AI 辅助决策中心查看。</p></div></div></>;
}
