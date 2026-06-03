import type { ReactNode } from "react";

type Variant = "default" | "primary" | "success" | "warning" | "danger" | "muted";

const VARIANTS: Record<Variant, string> = {
  default: "bg-surface-2 text-text border border-border",
  primary: "bg-primary/15 text-primary border border-primary/30",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
  muted: "bg-surface-2 text-muted border border-border",
};

export function Badge({
  children,
  variant = "default",
  title,
}: {
  children: ReactNode;
  variant?: Variant;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
