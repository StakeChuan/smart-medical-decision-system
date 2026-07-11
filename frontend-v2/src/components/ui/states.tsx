import { AlertCircle, FileQuestion, LoaderCircle } from "lucide-react";
import { Button } from "./button";

export function Skeleton({ className = "h-12" }: { className?: string }) { return <div className={`animate-pulse rounded-sm bg-slate-200/70 ${className}`} />; }

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center border-t border-border px-6 text-center"><FileQuestion className="mb-3 h-5 w-5 text-muted"/><strong>{title}</strong><p className="mt-1 text-sm text-muted">{description}</p></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="flex min-h-48 flex-col items-center justify-center border border-danger/20 bg-danger/5 p-6 text-center"><AlertCircle className="mb-3 h-6 w-6 text-danger"/><strong>数据加载失败</strong><p className="mt-1 max-w-md text-sm text-muted">{message}</p>{onRetry && <Button className="mt-4" variant="secondary" onClick={onRetry}>重新加载</Button>}</div>;
}

export function LoadingLabel({ children }: { children: string }) { return <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />{children}</span>; }
