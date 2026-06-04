import { useEffect, useState } from "react";
import {
  X,
  MessageCircle,
  Mail,
  Building2,
  Clock,
  RotateCcw,
  XCircle,
  Save,
  Send,
} from "lucide-react";
import { useOpportunityDetail } from "@/api/hooks";
import {
  useAssign,
  useUpdateValue,
  useUpdateNotes,
  useReactivate,
  useMoveOpportunity,
  useCreateInteraction,
} from "@/api/mutations";
import { usePipelines } from "@/api/hooks";
import type { InteractionType } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Loading, ErrorState } from "@/components/ui/States";
import {
  STATUS_LABELS,
  SOURCE_LABELS,
  SCORE_META,
  LOST_REASON_LABELS,
  formatPhone,
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

// Tipos que o usuário pode registrar manualmente (exclui automáticos).
const USER_INTERACTION_TYPES: InteractionType[] = [
  "ligacao",
  "whatsapp",
  "email",
  "reuniao",
  "meet",
  "visita",
  "observacao",
];

interface Props {
  opportunityId: number | null;
  onClose: () => void;
  /** Se definido, mostra o botão "Marcar como perdido" (abre o modal). */
  onRequestLose?: (opportunityId: number) => void;
}

export function OpportunityDrawer({ opportunityId, onClose, onRequestLose }: Props) {
  const open = opportunityId !== null;
  const { data, isLoading, isError, error } = useOpportunityDetail(opportunityId);

  const assign = useAssign();
  const updateValue = useUpdateValue();
  const updateNotes = useUpdateNotes();
  const reactivate = useReactivate();
  const move = useMoveOpportunity();
  const { data: pipelines } = usePipelines();
  const createInteraction = useCreateInteraction();

  // Estado editável
  const [assignedTo, setAssignedTo] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [iType, setIType] = useState<InteractionType>("ligacao");
  const [iUser, setIUser] = useState("");
  const [iNotes, setINotes] = useState("");

  const oppId = data?.opportunity.id;
  useEffect(() => {
    if (data) {
      setAssignedTo(data.opportunity.assigned_to ?? "");
      setValue(data.opportunity.value != null ? String(data.opportunity.value) : "");
      setNotes(data.opportunity.notes ?? "");
      setINotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppId]);

  async function saveDetails() {
    if (oppId === undefined || !data) return;
    const tasks: Promise<unknown>[] = [];
    const newAssigned = assignedTo.trim() || null;
    if (newAssigned !== (data.opportunity.assigned_to ?? null)) {
      tasks.push(assign.mutateAsync({ id: oppId, assigned_to: newAssigned }));
    }
    const newValue = value.trim() === "" ? null : Number(value);
    if (newValue !== (data.opportunity.value ?? null)) {
      tasks.push(updateValue.mutateAsync({ id: oppId, value: newValue }));
    }
    const newNotes = notes.trim() || null;
    if (newNotes !== (data.opportunity.notes ?? null)) {
      tasks.push(updateNotes.mutateAsync({ id: oppId, notes: newNotes }));
    }
    await Promise.all(tasks);
  }

  async function submitInteraction() {
    if (oppId === undefined || !iNotes.trim()) return;
    await createInteraction.mutateAsync({
      opportunity_id: oppId,
      type: iType,
      notes: iNotes.trim(),
      user: iUser.trim() || null,
    });
    setINotes("");
  }

  const savingDetails = assign.isPending || updateValue.isPending || updateNotes.isPending;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
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
                  <Badge variant="primary">{STATUS_LABELS[data.opportunity.status]}</Badge>
                  {data.opportunity.source && (
                    <Badge variant="muted">{SOURCE_LABELS[data.opportunity.source]}</Badge>
                  )}
                  {(data.opportunity.is_repurchase || data.opportunity.had_previous_purchase) && (
                    <Badge variant="warning">Cliente recorrente</Badge>
                  )}
                  {data.opportunity.reentry_count > 0 && (
                    <Badge variant="primary">{data.opportunity.reentry_count} reentrada(s)</Badge>
                  )}
                </div>
              </section>

              {/* Ações de destino */}
              <section className="flex flex-wrap gap-2">
                {data.opportunity.status === "perdido" ? (
                  <button
                    onClick={() => reactivate.mutate({ id: data.opportunity.id })}
                    disabled={reactivate.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <RotateCcw size={15} />
                    {reactivate.isPending ? "Reativando..." : "Reativar lead"}
                  </button>
                ) : (
                  onRequestLose &&
                  data.opportunity.status !== "fechado" && (
                    <button
                      onClick={() => onRequestLose(data.opportunity.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
                    >
                      <XCircle size={15} />
                      Marcar como perdido
                    </button>
                  )
                )}
              </section>

              {/* Contato */}
              <section className="rounded-lg border border-border p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Contato</h3>
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

              {/* Edição do negócio */}
              <section className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-muted">Negócio</h3>
                  <button
                    onClick={saveDetails}
                    disabled={savingDetails}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <Save size={13} />
                    {savingDetails ? "Salvando..." : "Salvar"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput
                    label="Responsável"
                    value={assignedTo}
                    onChange={setAssignedTo}
                    placeholder="Sem responsável"
                  />
                  <LabeledInput
                    label="Valor (R$)"
                    value={value}
                    onChange={setValue}
                    placeholder="0,00"
                    type="number"
                  />
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-[11px] uppercase text-muted">Notas internas</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </div>
                {data.opportunity.item_name && (
                  <p className="mt-2 text-xs text-muted">
                    Produto/Serviço: <span className="text-text">{data.opportunity.item_name}</span>
                  </p>
                )}
              </section>

              {/* Funil / etapa — move dentro e entre funis */}
              {pipelines && pipelines.length > 0 && (
                <section className="rounded-lg border border-border p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Funil / etapa</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={data.opportunity.pipeline_id ?? ""}
                      onChange={(e) => {
                        const p = pipelines.find((x) => x.id === Number(e.target.value));
                        const firstOpen = p?.stages.find((s) => s.category === "open") ?? p?.stages[0];
                        if (firstOpen) move.mutate({ id: data.opportunity.id, stage_id: firstOpen.id });
                      }}
                      className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
                    >
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      value={data.opportunity.stage_id ?? ""}
                      onChange={(e) => move.mutate({ id: data.opportunity.id, stage_id: Number(e.target.value) })}
                      className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
                    >
                      {(pipelines.find((p) => p.id === data.opportunity.pipeline_id)?.stages ?? [])
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                </section>
              )}

              {/* Perda */}
              {data.opportunity.status === "perdido" && (
                <section className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm">
                  <h3 className="mb-1 text-xs font-semibold uppercase text-danger">Perda</h3>
                  <p>
                    Motivo:{" "}
                    {data.opportunity.lost_reason
                      ? LOST_REASON_LABELS[data.opportunity.lost_reason]
                      : "—"}{" "}
                    · {data.opportunity.is_recoverable ? "Recuperável" : "Descartado"}
                  </p>
                  {data.opportunity.follow_up_at && (
                    <p className="text-muted">Reativar em {formatDate(data.opportunity.follow_up_at)}</p>
                  )}
                  {data.opportunity.lost_observation && (
                    <p className="mt-1 text-muted">{data.opportunity.lost_observation}</p>
                  )}
                </section>
              )}

              {/* Registrar interação */}
              <section className="rounded-lg border border-border p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Registrar interação</h3>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={iType}
                    onChange={(e) => setIType(e.target.value as InteractionType)}
                    className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
                  >
                    {USER_INTERACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {INTERACTION_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={iUser}
                    onChange={(e) => setIUser(e.target.value)}
                    placeholder="Seu nome"
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  value={iNotes}
                  onChange={(e) => setINotes(e.target.value)}
                  rows={2}
                  placeholder="Descreva o que aconteceu..."
                  className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
                <button
                  onClick={submitInteraction}
                  disabled={!iNotes.trim() || createInteraction.isPending}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Send size={14} />
                  {createInteraction.isPending ? "Registrando..." : "Registrar"}
                </button>
              </section>

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
                          {it.user && <span className="text-xs text-muted">· {it.user}</span>}
                        </div>
                        {it.notes && <p className="text-sm text-text/90">{it.notes}</p>}
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

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase text-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
    </div>
  );
}
