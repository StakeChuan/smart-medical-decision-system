import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <p className="text-sm text-muted">{eyebrow}</p>}<h1 className={eyebrow ? "mt-1 text-2xl font-semibold" : "text-2xl font-semibold"}>{title}</h1><p className="mt-2 text-sm text-muted">{description}</p></div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</header>;
}
