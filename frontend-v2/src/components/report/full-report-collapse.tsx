import { ChevronDown, FileText } from "lucide-react";

export function FullReportCollapse({ fullReport }: { fullReport: string | null }) {
  return <details className="full-report-collapse"><summary><span><FileText className="h-4 w-4" />原始完整报告</span><span className="flex items-center gap-2 text-xs font-normal text-muted">默认折叠<ChevronDown className="h-4 w-4" /></span></summary><div className="full-report-content">{fullReport ? <pre>{fullReport}</pre> : <div className="medical-empty"><strong>未提供原始完整报告</strong><p>当前报告仅包含结构化字段，没有可展示的完整原文。</p></div>}</div></details>;
}
