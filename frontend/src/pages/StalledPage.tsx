import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useStalled } from "@/api/hooks";
import type { BoardCard } from "@/api/types";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { LostModal } from "@/components/modals/LostModal";
import { Loading, ErrorState, Empty, PageHeader } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { STATUS_LABELS, formatPhone, whatsappLink } from "@/lib/format";

export function StalledPage() {
  const { data, isLoading, isError, error } = useStalled();
  const [selected, setSelected] = useState<number | null>(null);
  const [loseTarget, setLoseTarget] = useState<number | null>(null);

  // Vermelho (danger) primeiro, depois amarelo (warning).
  const sorted = [...(data ?? [])].sort((a, b) => {
    const rank = (c: BoardCard) => (c.opportunity.stall_level === "danger" ? 0 : 1);
    return rank(a) - rank(b);
  });

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Leads parados"
        subtitle="Oportunidades ativas sem interação recente. Aja antes de esfriar."
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && data.length === 0 && <Empty>Nenhum lead parado. Tudo em dia! 🎉</Empty>}
        {sorted.length > 0 && (
          <div className="grid gap-2">
            {sorted.map(({ opportunity: o, contact }) => {
              const danger = o.stall_level === "danger";
              return (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className={`flex items-center justify-between gap-4 rounded-lg border bg-surface p-3 text-left transition hover:shadow-md ${
                    danger ? "border-danger/40" : "border-warning/40"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AlertTriangle
                      size={18}
                      className={danger ? "text-danger" : "text-warning"}
                    />
                    <div className="min-w-0">
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-xs text-muted">
                        {formatPhone(contact.phone)} · {STATUS_LABELS[o.status]}
                        {o.assigned_to ? ` · ${o.assigned_to}` : " · Sem responsável"}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={danger ? "danger" : "warning"}>
                      {o.days_since_interaction ?? 0}d sem interação
                    </Badge>
                    {whatsappLink(contact.phone) && (
                      <a
                        href={whatsappLink(contact.phone)!}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-md bg-success/15 px-2 py-1 text-xs font-medium text-success hover:bg-success/25"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <OpportunityDrawer
        opportunityId={selected}
        onClose={() => setSelected(null)}
        onRequestLose={setLoseTarget}
      />
      <LostModal opportunityId={loseTarget} onClose={() => setLoseTarget(null)} />
    </div>
  );
}
