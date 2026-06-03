import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { useBoard } from "@/api/hooks";
import type { BoardFilters, LeadScore, OpportunitySource } from "@/api/types";
import { Board } from "@/components/kanban/Board";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { LostModal } from "@/components/modals/LostModal";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";
import { SCORE_META, SOURCE_LABELS } from "@/lib/format";

// Rótulos legíveis dos filtros ativos (para os chips).
const FILTER_LABELS: Record<string, (v: string) => string> = {
  unassigned: () => "Sem responsável",
  is_repurchase: () => "Recompra",
  follow_up_today: () => "Follow-up hoje",
  recoverable: () => "Perdido recuperável",
  score: (v) => `Score: ${SCORE_META[v as LeadScore]?.label ?? v}`,
  source: (v) => `Origem: ${SOURCE_LABELS[v as OpportunitySource] ?? v}`,
};

function parseFilters(params: URLSearchParams): BoardFilters {
  const f: BoardFilters = {};
  if (params.get("unassigned") === "true") f.unassigned = true;
  if (params.get("is_repurchase") === "true") f.is_repurchase = true;
  if (params.get("follow_up_today") === "true") f.follow_up_today = true;
  if (params.get("recoverable") === "true") f.recoverable = true;
  const score = params.get("score");
  if (score) f.score = score as LeadScore;
  const source = params.get("source");
  if (source) f.source = source as OpportunitySource;
  return f;
}

export function KanbanPage() {
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);
  const activeKeys = Object.keys(filters);

  const { data, isLoading, isError, error } = useBoard(filters);
  const [selected, setSelected] = useState<number | null>(null);
  const [loseTarget, setLoseTarget] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Funil de vendas"
        subtitle="Arraste os cards entre as etapas. Soltar em 'Perdido' pede justificativa."
      />

      {activeKeys.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Filtros:</span>
          {activeKeys.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary"
            >
              {FILTER_LABELS[key]?.(String(params.get(key))) ?? key}
            </span>
          ))}
          <button
            onClick={() => setParams({})}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface-2"
          >
            <X size={12} /> Limpar
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && (
          <Board cards={data} onOpenCard={setSelected} onRequestLose={setLoseTarget} />
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
