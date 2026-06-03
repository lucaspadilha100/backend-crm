import { SlidersHorizontal, X } from "lucide-react";
import type { useSearchParams } from "react-router-dom";
import { SCORE_META, SOURCE_LABELS } from "@/lib/format";
import type { LeadScore, OpportunitySource } from "@/api/types";

type Params = ReturnType<typeof useSearchParams>[0];
type SetParams = ReturnType<typeof useSearchParams>[1];

// Filtros booleanos (chips liga/desliga).
const TOGGLES: { key: string; label: string }[] = [
  { key: "unassigned", label: "Sem responsável" },
  { key: "is_repurchase", label: "Recompra" },
  { key: "reentrada", label: "Com reentrada" },
  { key: "stalled", label: "Parados" },
  { key: "follow_up_today", label: "Follow-up hoje" },
  { key: "recoverable", label: "Recuperável" },
  { key: "archived", label: "Descartados" },
];

const SCORES: LeadScore[] = ["quente", "morno", "frio"];
const SOURCES = Object.keys(SOURCE_LABELS) as OpportunitySource[];

export function FilterBar({
  params,
  setParams,
}: {
  params: Params;
  setParams: SetParams;
}) {
  const active = Array.from(params.keys());

  function toggle(key: string) {
    const next = new URLSearchParams(params);
    if (next.get(key) === "true") next.delete(key);
    else next.set(key, "true");
    setParams(next);
  }

  function setValue(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
        <SlidersHorizontal size={14} /> Filtros:
      </span>

      {TOGGLES.map(({ key, label }) => {
        const on = params.get(key) === "true";
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              on
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted hover:bg-surface-2"
            }`}
          >
            {label}
          </button>
        );
      })}

      {/* Score */}
      <select
        value={params.get("score") ?? ""}
        onChange={(e) => setValue("score", e.target.value)}
        className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
      >
        <option value="">Score: todos</option>
        {SCORES.map((s) => (
          <option key={s} value={s}>
            {SCORE_META[s].emoji} {SCORE_META[s].label}
          </option>
        ))}
      </select>

      {/* Origem */}
      <select
        value={params.get("source") ?? ""}
        onChange={(e) => setValue("source", e.target.value)}
        className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
      >
        <option value="">Origem: todas</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {SOURCE_LABELS[s]}
          </option>
        ))}
      </select>

      {active.length > 0 && (
        <button
          onClick={() => setParams({})}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface-2"
        >
          <X size={12} /> Limpar
        </button>
      )}
    </div>
  );
}
