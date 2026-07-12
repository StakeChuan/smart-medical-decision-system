import { Gauge } from "lucide-react";

export function AIConfidenceScore() {
  return <section className="diagnosis-section" aria-labelledby="confidence-title"><div className="diagnosis-section-heading"><div><span>模型信息</span><h2 id="confidence-title">AI 置信度</h2></div><Gauge className="h-5 w-5 text-muted" /></div><div className="medical-empty"><strong>未提供量化置信度</strong><p>后端报告未返回可信度数值，本页不会生成或估算分数。</p></div></section>;
}
