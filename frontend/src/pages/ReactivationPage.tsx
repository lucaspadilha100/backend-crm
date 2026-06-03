import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useReactivationQueue } from "@/api/hooks";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { Loading, ErrorState, Empty, PageHeader } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import {
  LOST_REASON_LABELS,
  formatDate,
  formatPhone,
  whatsappLink,
} from "@/lib/format";

export function ReactivationPage() {
  const { data, isLoading, isError, error } = useReactivationQueue();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Leads para reativar"
        subtitle="Perdidos recuperáveis com follow-up agendado para hoje ou antes."
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && data.length === 0 && (
          <Empty>Nenhum lead para reativar hoje. 🎉</Empty>
        )}
        {data && data.length > 0 && (
          <div className="grid gap-2">
            {data.map(({ opportunity: o, contact }) => (
              <button
                key={o.id}
                onClick={() => setSelected(o.id)}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3 text-left transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-xs text-muted">
                    {formatPhone(contact.phone)}
                    {o.assigned_to ? ` · ${o.assigned_to}` : " · Sem responsável"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {o.lost_reason && (
                    <Badge variant="danger">{LOST_REASON_LABELS[o.lost_reason]}</Badge>
                  )}
                  <Badge variant="warning">
                    <CalendarClock size={11} /> {formatDate(o.follow_up_at)}
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
            ))}
          </div>
        )}
      </div>
      <OpportunityDrawer opportunityId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
