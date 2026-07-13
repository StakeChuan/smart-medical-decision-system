import { BellOff, CheckCheck, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { DoctorActionReminder, MessageCategory } from "../types";
import { MessageItem } from "./message-item";

export function MessageList({ category, reminders, reviewedIds, onOpen }: { category: MessageCategory; reminders: DoctorActionReminder[]; reviewedIds: Set<string>; onOpen: (id: string) => void }) {
  if (category === "system") return <div className="message-empty"><Inbox className="h-6 w-6" /><strong>暂无系统消息</strong><p>本阶段不创建模拟系统消息，也不接入聊天会话。</p></div>;
  const visible = reminders.filter((item) => category === "reviewed" ? reviewedIds.has(item.id) : !reviewedIds.has(item.id));
  if (!visible.length) return <div className="message-empty">{category === "reviewed" ? <CheckCheck className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}<strong>{category === "reviewed" ? "本会话暂无已查看提醒" : "暂无需要处理的信息"}</strong><p>{category === "reviewed" ? "打开行动提醒后，会在本次浏览器会话中记录。" : "近期问诊暂时没有需要查看的行动提醒。"}</p>{category === "pending" && <div><Button asChild variant="secondary"><Link to="/doctor/patients">患者管理</Link></Button><Button asChild><Link to="/doctor/consultations/new">新建问诊</Link></Button></div>}</div>;
  return <div className="divide-y divide-border">{visible.map((reminder) => <MessageItem key={reminder.id} reminder={reminder} reviewed={category === "reviewed"} onOpen={onOpen} />)}</div>;
}
