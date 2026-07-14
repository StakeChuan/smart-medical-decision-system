import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger = false,
  isPending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="confirm-dialog-overlay" />
      <Dialog.Content className="confirm-dialog-content" onEscapeKeyDown={(event) => { if (isPending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (isPending) event.preventDefault(); }}>
        <div className={`confirm-dialog-icon ${danger ? "is-danger" : ""}`}><AlertTriangle className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><Dialog.Title className="text-base font-semibold">{title}</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-muted">{description}</Dialog.Description></div>
        <Dialog.Close asChild><Button aria-label="关闭确认窗口" title="关闭" variant="ghost" size="icon" className="confirm-dialog-close" disabled={isPending}><X className="h-4 w-4" /></Button></Dialog.Close>
        <div className="confirm-dialog-actions"><Dialog.Close asChild><Button variant="secondary" disabled={isPending}>取消</Button></Dialog.Close><Button variant={danger ? "danger" : "primary"} disabled={isPending} onClick={onConfirm}>{isPending ? "正在处理" : confirmLabel}</Button></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
