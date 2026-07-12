import { BookOpenCheck } from "lucide-react";

export function EvidenceCitation() {
  return <section className="diagnosis-section" aria-labelledby="evidence-title"><div className="diagnosis-section-heading"><div><span>可追溯性</span><h2 id="evidence-title">医学依据</h2></div><BookOpenCheck className="h-5 w-5 text-muted" /></div><div className="medical-empty"><strong>未提供可验证医学引用</strong><p>当前接口没有返回文献名称、指南版本或来源链接，因此本页不展示推测性引用。</p></div></section>;
}
