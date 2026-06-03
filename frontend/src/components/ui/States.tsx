import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-muted">
      <Loader2 className="animate-spin" size={18} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-danger">
      <AlertTriangle size={22} />
      <p className="text-sm font-medium">Falha ao carregar</p>
      {message && <p className="max-w-sm text-center text-xs text-muted">{message}</p>}
      <p className="text-xs text-muted">
        Verifique se a API está no ar (VITE_API_URL).
      </p>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
      <Inbox size={22} />
      <p className="text-sm">{children}</p>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
