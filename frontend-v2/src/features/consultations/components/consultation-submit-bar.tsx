import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConsultationSubmitBar({ disabled, isSubmitting }: { disabled: boolean; isSubmitting: boolean }) {
  return <div className="consultation-submit-bar"><div><ShieldCheck className="h-4 w-4" /><p><strong>由医生确认后提交</strong><span>创建问诊不会自动生成 AI 报告。</span></p></div><Button type="submit" disabled={disabled || isSubmitting}>{isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{isSubmitting ? "正在创建问诊" : "创建并进入 AI 诊断"}{!isSubmitting && <ArrowRight className="h-4 w-4" />}</Button></div>;
}
