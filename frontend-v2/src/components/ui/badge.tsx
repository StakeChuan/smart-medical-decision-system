import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "border-border bg-canvas text-muted", success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning", danger: "border-danger/20 bg-danger/10 text-danger",
  info: "border-primary/20 bg-primary/10 text-primary",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex min-h-6 items-center rounded-sm border px-2 text-xs font-semibold", tones[tone], className)} {...props} />;
}
