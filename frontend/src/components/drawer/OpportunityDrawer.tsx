import { X, MessageCircle, Mail, Building2, Clock } from "lucide-react";
import { useOpportunityDetail } from "@/api/hooks";
import type { InteractionType } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Loading, ErrorState } from "@/components/ui/States";
import {
  STATUS_LABELS,
  SOURCE_LABELS,
  SCORE_META,
  LOST_REASON_LABELS,
  formatPhone,
  formatMoney,
  formatDate,
  formatDateTime,
  whatsappLink,
} from "@/lib/format";

const INTERACTION_LABELS: Record<InteractionType, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reuniao: "Reunião",
  meet: "Meet",
  visita: "Visita",
  observacao: "Observação",
  reentrada: "Reentrada",
  sistema: "Sistema",
};

interface Props {
  opportunityId: number | null;
  onClose: () => void;
}

export function OpportunityDrawer({ opportunityId, onClose }: Props) {
  const open = opportunityId !== null;
  const { data, isLoading, isError, error } = useOpportunityDetail(opportunityId);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Painel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold text-muted">
            Oportunidade {opportunityId ? `#${opportunityId}` : ""}
          </span>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </header>

        <div className="thin-scroll flex-1 overflow-y-auto p-4">
          {isLoading && <Loading />}
          {isError && <ErrorState message={(error as Error)?.message} />}
          {data && (
            <div className="space-y-5">
              {/* Resumo */}
              <section>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold">{data.contact.name}</h2>
                  <span title={SCORE_META[data.opportunity.score].label} className="text-lg">
                    {SCORE_META[data.opportunity.score].emoji}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="primary">
                    {STATUS_LABELS[data.opportunity.status]}
                  </Badge>
                  {data.opportunity.source && (
                    <Badge variant="muted">{SOURCE_LABELS[data.opportunity.source]}</Badge>
                  )}
                  {(data.opportunity.is_repurchase ||
                    data.opportunity.had_previous_purchase) && (
                    <Badge variant="warning">Cliente recorrente</Badge>
                  )}
                  {data.opportunity.reentry_count > 0 && (
                    <Badge variant="primary">
                      {data.opportunity.reentry_count} reentrada(s)
                    </Badge>
                  )}
                </div>
              </section>

              {/* Contato */}
              <section className="rounded-lg border border-border p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted">
                  Contato
                </h3>
                <div className="space-y-1.5 text-sm">
                  {data.contact.phone && (
                    <div className="flex items-center gap-2">
                      <MessageCircle size={14} className="text-success" />
                      {whatsappLink(data.contact.phone) ? (
                        <a
                          href={whatsappLink(data.contact.phone)!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-success hover:underline"
                        >
                          {formatPhone(data.contact.phone)}
                        </a>
                      ) : (
                        formatPhone(data.contact.phone)
                      )}
                    </div>
                  )}
                  {data.contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-muted" />
                      {data.contact.email}
                    </div>
                  )}
                  {data.contact.company && (
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-muted" />
                      {data.contact.company}
                    </div>
                  )}
                </div>
              </section>

              {/* Negócio */}
              <section className="grid grid-cols-2 gap-3">
                <Info label="Produto/Serviço" value={data.opportunity.item_name ?? "—"} />
                <Info label="Valor" value={formatMoney(data.opportunity.value)} />
                <Info label="Responsável" value={data.opportunity.assigned_to ?? "Sem responsável"} />
                <Info
                  label="Dias sem interação"
                  value={
                    data.opportunity.days_since_interaction != null
                      ? `${data.opportunity.days_since_interaction} dia(s)`
                      : "—"
                  }
                />
              </section>

              {/* Perda */}
              {data.opportunity.status === "perdido" && (
                <section className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm">
                  <h3 className="mb-1 text-xs font-semibold uppercase text-danger">
                    Perda
                  </h3>
                  <p>
                    Motivo:{" "}
                    {data.opportunity.lost_reason
                      ? LOST_REASON_LABELS[data.opportunity.lost_reason]
                      : "—"}{" "}
                    · {data.opportunity.is_recoverable ? "Recuperável" : "Descartado"}
                  </p>
                  {data.opportunity.follow_up_at && (
                    <p className="text-muted">
                      Reativar em {formatDate(data.opportunity.follow_up_at)}
                    </p>
                  )}
                </section>
              )}

              {/* Mensagem do lead */}
              {data.opportunity.message && (
                <section className="rounded-lg border border-border p-3 text-sm">
                  <h3 className="mb-1 text-xs font-semibold uppercase text-muted">
                    Mensagem
                  </h3>
                  <p className="text-text">{data.opportunity.message}</p>
                </section>
              )}

              {/* Histórico */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted">
                  Histórico ({data.interactions.length})
                </h3>
                {data.interactions.length === 0 ? (
                  <p className="text-sm text-muted">Sem interações ainda.</p>
                ) : (
                  <ol className="space-y-3 border-l border-border pl-4">
                    {data.interactions.map((it) => (
                      <li key={it.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {INTERACTION_LABELS[it.type]}
                          {it.user && (
                            <span className="text-xs text-muted">· {it.user}</span>
                          )}
                        </div>
                        {it.notes && (
                          <p className="text-sm text-text/90">{it.notes}</p>
                        )}
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                          <Clock size={11} />
                          {formatDateTime(it.created_at)}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="text-[11px] uppercase text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
