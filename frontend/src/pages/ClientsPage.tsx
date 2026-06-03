import { useState } from "react";
import { Search, Crown, Building2, Phone, Mail } from "lucide-react";
import { useContacts, useContactSummary } from "@/api/hooks";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { Badge } from "@/components/ui/Badge";
import { Loading, ErrorState, Empty, PageHeader } from "@/components/ui/States";
import {
  STATUS_LABELS,
  formatPhone,
  formatMoney,
  formatDate,
  whatsappLink,
} from "@/lib/format";
import type { OpportunityStatus } from "@/api/types";

export function ClientsPage() {
  const { data: contacts, isLoading, isError, error } = useContacts();
  const [query, setQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<number | null>(null);

  const filtered = (contacts ?? []).filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Clientes" subtitle="Visão 360 do relacionamento." />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[20rem_1fr]">
        {/* Lista */}
        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-surface">
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
              <Search size={15} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="thin-scroll flex-1 overflow-y-auto">
            {isLoading && <Loading />}
            {isError && <ErrorState message={(error as Error)?.message} />}
            {contacts && filtered.length === 0 && <Empty>Nenhum cliente.</Empty>}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c.id)}
                className={`flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left transition hover:bg-surface-2 ${
                  selectedContact === c.id ? "bg-surface-2" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted">{formatPhone(c.phone)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detalhe */}
        <div className="min-h-0 overflow-y-auto rounded-xl border border-border bg-surface">
          {selectedContact === null ? (
            <Empty>Selecione um cliente para ver o histórico completo.</Empty>
          ) : (
            <ContactDetail contactId={selectedContact} />
          )}
        </div>
      </div>
    </div>
  );
}

function ContactDetail({ contactId }: { contactId: number }) {
  const { data, isLoading, isError, error } = useContactSummary(contactId);
  const [openOpp, setOpenOpp] = useState<number | null>(null);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={(error as Error)?.message} />;
  if (!data) return null;

  const { contact } = data;
  const wa = whatsappLink(contact.phone);

  return (
    <div className="p-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{contact.name}</h2>
            {data.is_returning && (
              <Badge variant="warning" title="Já comprou antes">
                <Crown size={11} /> Cliente recorrente
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
            {contact.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone size={13} /> {formatPhone(contact.phone)}
              </span>
            )}
            {contact.email && (
              <span className="inline-flex items-center gap-1">
                <Mail size={13} /> {contact.email}
              </span>
            )}
            {contact.company && (
              <span className="inline-flex items-center gap-1">
                <Building2 size={13} /> {contact.company}
              </span>
            )}
          </div>
        </div>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg bg-success/15 px-3 py-2 text-sm font-medium text-success hover:bg-success/25"
          >
            WhatsApp
          </a>
        )}
      </div>

      {/* Métricas do relacionamento */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Oportunidades" value={data.total_opportunities} />
        <Stat label="Compras" value={data.purchases} accent="text-success" />
        <Stat label="Valor gerado" value={formatMoney(data.total_value)} accent="text-success" />
        <Stat label="Reentradas" value={data.reentries} />
      </div>

      {data.current_status && (
        <p className="mt-3 text-sm text-muted">
          Status atual:{" "}
          <span className="font-medium text-text">
            {STATUS_LABELS[data.current_status as OpportunityStatus] ?? data.current_status}
          </span>
        </p>
      )}

      {/* Cadências futuras */}
      {data.upcoming_cadences.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Cadências futuras</h3>
          <div className="space-y-1.5">
            {data.upcoming_cadences.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{STATUS_LABELS[o.status]}</span>
                <Badge variant="primary">{formatDate(o.follow_up_at)}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Histórico de oportunidades */}
      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase text-muted">
          Oportunidades ({data.opportunities.length})
        </h3>
        <div className="space-y-1.5">
          {data.opportunities.map((o) => (
            <button
              key={o.id}
              onClick={() => setOpenOpp(o.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:bg-surface-2"
            >
              <div className="min-w-0">
                <span className="font-medium">{STATUS_LABELS[o.status]}</span>
                {o.item_name && (
                  <span className="ml-2 text-xs text-muted">{o.item_name}</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
                {o.value != null && <span className="text-success">{formatMoney(o.value)}</span>}
                <span>{formatDate(o.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <OpportunityDrawer opportunityId={openOpp} onClose={() => setOpenOpp(null)} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "text-text",
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className={`text-lg font-bold ${accent}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
