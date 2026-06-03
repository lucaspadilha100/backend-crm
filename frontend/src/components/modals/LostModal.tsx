import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { LostReason } from "@/api/types";
import { useLoseOpportunity } from "@/api/mutations";
import { LOST_REASON_LABELS } from "@/lib/format";

interface Props {
  opportunityId: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASONS = Object.keys(LOST_REASON_LABELS) as LostReason[];
const PRESETS = [15, 30, 60, 90] as const;

export function LostModal({ opportunityId, onClose, onSuccess }: Props) {
  const open = opportunityId !== null;
  const lose = useLoseOpportunity();

  const [reason, setReason] = useState<LostReason | "">("");
  const [observation, setObservation] = useState("");
  const [recoverable, setRecoverable] = useState(true);
  const [preset, setPreset] = useState<number | "custom">(30);
  const [customDate, setCustomDate] = useState("");

  // Reseta o formulário a cada abertura.
  useEffect(() => {
    if (open) {
      setReason("");
      setObservation("");
      setRecoverable(true);
      setPreset(30);
      setCustomDate("");
      lose.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opportunityId]);

  if (!open) return null;

  function computeFollowUp(): string | null {
    if (!recoverable) return null;
    if (preset === "custom") {
      return customDate ? new Date(customDate).toISOString() : null;
    }
    return new Date(Date.now() + preset * 86_400_000).toISOString();
  }

  const followUp = computeFollowUp();
  const invalid = !reason || (recoverable && preset === "custom" && !customDate);

  async function handleSubmit() {
    if (invalid || opportunityId === null) return;
    await lose.mutateAsync({
      id: opportunityId,
      data: {
        reason: reason as LostReason,
        observation: observation || null,
        is_recoverable: recoverable,
        follow_up_at: followUp,
      },
    });
    onSuccess?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger" />
            <h2 className="font-semibold">Marcar como perdido</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 p-4">
          {/* Motivo (obrigatório) */}
          <Field label="Motivo da perda *">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as LostReason)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {LOST_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>

          {/* Classificação */}
          <Field label="Classificação">
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton
                active={recoverable}
                onClick={() => setRecoverable(true)}
                title="Recuperável"
                subtitle="Volta em cadência"
              />
              <ChoiceButton
                active={!recoverable}
                onClick={() => setRecoverable(false)}
                title="Descartado"
                subtitle="Será arquivado"
              />
            </div>
          </Field>

          {/* Cadência (só recuperável) */}
          {recoverable && (
            <Field label="Reativar em">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setPreset(d)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      preset === d
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    {d} dias
                  </button>
                ))}
                <button
                  onClick={() => setPreset("custom")}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    preset === "custom"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border hover:bg-surface-2"
                  }`}
                >
                  Personalizado
                </button>
              </div>
              {preset === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              )}
            </Field>
          )}

          {/* Observação */}
          <Field label="Observação">
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              placeholder="Detalhes da perda..."
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </Field>

          {lose.isError && (
            <p className="text-xs text-danger">
              {(lose.error as Error)?.message ?? "Erro ao salvar."}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={invalid || lose.isPending}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {lose.isPending ? "Salvando..." : "Confirmar perda"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left ${
        active ? "border-primary bg-primary/10" : "border-border hover:bg-surface-2"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted">{subtitle}</div>
    </button>
  );
}
