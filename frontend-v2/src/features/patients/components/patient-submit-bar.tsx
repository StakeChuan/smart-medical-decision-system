import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PatientSubmitBar({ isSubmitting }: { isSubmitting: boolean }) {
  return <div className="patient-submit-bar"><div><ShieldCheck className="h-4 w-4" /><p><strong>创建患者档案</strong><span>不会自动创建问诊或调用 AI 分析。</span></p></div><Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSubmitting ? "正在创建患者" : "创建并查看患者"}{!isSubmitting && <ArrowRight className="h-4 w-4" />}</Button></div>;
}
