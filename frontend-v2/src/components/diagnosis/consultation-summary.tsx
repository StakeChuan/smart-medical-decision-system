import type { Consultation } from "@/types/consultation";

const fields: Array<{ label: string; key: keyof Pick<Consultation, "chiefComplaint" | "symptoms" | "presentIllness" | "pastHistory" | "examination"> }> = [
  { label: "主诉", key: "chiefComplaint" }, { label: "症状", key: "symptoms" }, { label: "现病史", key: "presentIllness" }, { label: "既往史", key: "pastHistory" }, { label: "检查结果", key: "examination" },
];

export function ConsultationSummary({ consultation }: { consultation: Consultation }) {
  return <section className="diagnosis-section" aria-labelledby="consultation-summary-title"><div className="diagnosis-section-heading"><div><span>临床输入</span><h2 id="consultation-summary-title">本次问诊摘要</h2></div><strong>问诊 #{consultation.id}</strong></div><div className="consultation-detail-grid">{fields.map(({ label, key }) => <div key={key}><span>{label}</span><p className={consultation[key] ? "" : "text-muted"}>{consultation[key] || "未记录"}</p></div>)}</div></section>;
}
