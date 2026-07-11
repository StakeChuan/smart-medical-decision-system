import type { LucideIcon } from "lucide-react";

export function Metric({ label, value, detail, icon: Icon }: { label: string; value: number | string; detail: string; icon: LucideIcon }) {
  return <div className="metric-block"><div className="flex items-start justify-between"><span className="text-sm text-muted">{label}</span><Icon className="h-4 w-4 text-primary" /></div><strong className="mt-4 block text-[28px] leading-8">{value}</strong><span className="mt-2 block text-xs text-muted">{detail}</span></div>;
}
