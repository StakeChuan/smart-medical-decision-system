import { Check, Copy, LoaderCircle, Printer, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportActions({ copyText, isRegenerating, onRegenerate }: { copyText: string; isRegenerating: boolean; onRegenerate: () => Promise<void> }) {
  const [copied, setCopied] = useState(false); const [copyError, setCopyError] = useState("");
  async function copyReport() { setCopyError(""); try { await navigator.clipboard.writeText(copyText); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopyError("复制失败，请检查浏览器剪贴板权限。" ); } }
  return <div className="report-actions print-hidden"><div><strong>报告操作</strong><p>{copyError || "复制、打印或基于当前问诊重新生成报告。"}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void copyReport()}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "已复制" : "复制报告"}</Button><Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />打印报告</Button><Button variant="secondary" disabled={isRegenerating} onClick={() => void onRegenerate()}>{isRegenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{isRegenerating ? "重新生成中" : "重新生成"}</Button></div></div>;
}
