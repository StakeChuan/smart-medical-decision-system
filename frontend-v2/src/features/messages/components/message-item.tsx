import { ArrowRight, BrainCircuit, CheckCircle2, FileCheck2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { DoctorActionReminder } from "../types";

const icons = { pending_analysis: BrainCircuit, report_review: FileCheck2, risk_review: ShieldAlert };
const labels = { pending_analysis: "待辅助分析", report_review: "待审核报告", risk_review: "待审核风险" };

export function MessageItem({ reminder, reviewed, onOpen }: { reminder: DoctorActionReminder; reviewed: boolean; onOpen: (id: string) => void }) {
  const navigate = useNavigate(); const Icon = icons[reminder.type];
  const openReminder = () => { onOpen(reminder.id); navigate(reminder.destination); };
  return <article className={`message-item ${reviewed ? "is-reviewed" : ""}`}><div className={`message-item-icon type-${reminder.type}`}><Icon className="h-4 w-4" /></div><div className="min-w-0"><div className="message-item-title"><strong>{reminder.title}</strong><Badge tone={reminder.type === "risk_review" ? "danger" : reminder.type === "pending_analysis" ? "warning" : "success"}>{labels[reminder.type]}</Badge>{reviewed && <Badge tone="neutral"><CheckCircle2 className="mr-1 h-3 w-3" />已查看</Badge>}</div><p>{reminder.description}</p><div className="message-patient-context"><strong>{reminder.patientName}</strong><span>患者 #{reminder.patientId}</span><span>问诊 #{reminder.consultationId}</span><span>问诊时间 {formatDateTime(reminder.consultationTime)}</span></div>{reminder.chiefComplaint && <p className="message-chief-complaint">主诉：{reminder.chiefComplaint}</p>}{reminder.type === "risk_review" && <div className="message-risk-facts"><span>风险等级：{reminder.riskLabel || "未提供"}</span><span>紧急程度：{reminder.urgencyLabel || "未提供"}</span>{reminder.riskWarning && <span>风险提示：{reminder.riskWarning}</span>}</div>}{reminder.supplementState === "error" && <p className="message-data-warning">部分报告信息暂不可用，可进入报告页重试查看。</p>}</div><Button variant="secondary" size="sm" onClick={openReminder}>{reminder.type === "pending_analysis" ? "进入辅助分析" : "进入审核"}<ArrowRight className="h-4 w-4" /></Button></article>;
}
