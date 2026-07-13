import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/states";
import type { ConsultationTrendPoint } from "../types";

function dateLabel(value: string) {
  const parts = value.split("-"); return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : value;
}

export function TrendSection({ data }: { data: ConsultationTrendPoint[] }) {
  return <section className="workspace-section" aria-labelledby="admin-trend-title"><div className="section-heading"><div><h2 id="admin-trend-title">近 7 天问诊趋势</h2><p>数据来自系统实际问诊记录</p></div></div>{data.length ? <div className="admin-trend-chart" aria-label="近7天问诊趋势图"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -24 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce5e7" /><XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 11, fill: "#607477" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#607477" }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(value) => `日期 ${value}`} formatter={(value) => [`${value} 次`, "问诊数量"]} contentStyle={{ borderRadius: 2, borderColor: "#dce5e7", fontSize: 12 }} /><Bar dataKey="consultationCount" name="问诊数量" fill="#176b72" radius={[2,2,0,0]} maxBarSize={42} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <EmptyState title="暂无趋势数据" description="当前接口未返回近 7 天问诊趋势。" />}</section>;
}
