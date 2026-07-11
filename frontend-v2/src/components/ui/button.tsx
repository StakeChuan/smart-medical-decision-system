import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50",
  { variants: {
    variant: {
      primary: "bg-primary text-white hover:bg-primary/90",
      secondary: "border border-border bg-surface text-foreground hover:bg-primary/5",
      ghost: "text-muted hover:bg-primary/5 hover:text-foreground",
      danger: "border border-danger/25 bg-danger/5 text-danger hover:bg-danger/10",
    },
    size: { default: "h-10 px-4", sm: "h-9 px-3", icon: "h-9 w-9 px-0" },
  }, defaultVariants: { variant: "primary", size: "default" } },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
