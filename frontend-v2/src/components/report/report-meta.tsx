import { CalendarClock, FileKey2, RefreshCw, Stethoscope } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { AiReport } from "@/types/report";

export function ReportMeta({ report, regenerated }: { report: AiReport; regenerated: boolean }) {
  const items = [
    { icon: FileKey2, label: "报告编号", value: `#${report.id}` },
    { icon: Stethoscope, label: "关联问诊", value: `#${report.consultationId}` },
    { icon: CalendarClock, label: "生成时间", value: formatDateTime(report.createdAt) },
    { icon: RefreshCw, label: "生成方式", value: regenerated ? "本次已重新生成" : "接口未提供生成方式" },
  ];
  return <section className="report-meta" aria-label="报告追溯信息">{items.map(({ icon: Icon, label, value }) => <div key={label}><Icon className="h-4 w-4" /><span>{label}</span><strong>{value}</strong></div>)}</section>;
}
