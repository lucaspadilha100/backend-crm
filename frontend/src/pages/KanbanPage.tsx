import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBoard } from "@/api/hooks";
import type { BoardCard, BoardFilters, LeadScore, OpportunitySource } from "@/api/types";
import { Board } from "@/components/kanban/Board";
import { FilterBar } from "@/components/kanban/FilterBar";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { LostModal } from "@/components/modals/LostModal";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";

// Filtros aplicados no servidor (board endpoint).
function serverFilters(params: URLSearchParams): BoardFilters {
  const f: BoardFilters = {};
  if (params.get("unassigned") === "true") f.unassigned = true;
  if (params.get("is_repurchase") === "true") f.is_repurchase = true;
  if (params.get("follow_up_today") === "true") f.follow_up_today = true;
  if (params.get("recoverable") === "true") f.recoverable = true;
  if (params.get("archived") === "true") f.archived = true;
  const score = params.get("score");
  if (score) f.score = score as LeadScore;
  const source = params.get("source");
  if (source) f.source = source as OpportunitySource;
  return f;
}

// Filtros aplicados no cliente (sem param dedicado no backend).
function clientPredicate(params: URLSearchParams): (c: BoardCard) => boolean {
  const reentrada = params.get("reentrada") === "true";
  const stalled = params.get("stalled") === "true";
  return (c) => {
    if (reentrada && (c.opportunity.reentry_count ?? 0) <= 0) return false;
    if (stalled && c.opportunity.stall_level === "ok") return false;
    return true;
  };
}

export function KanbanPage() {
  const [params, setParams] = useSearchParams();
  const filters = serverFilters(params);

  const { data, isLoading, isError, error } = useBoard(filters);
  const [selected, setSelected] = useState<number | null>(null);
  const [loseTarget, setLoseTarget] = useState<number | null>(null);

  const cards = (data ?? []).filter(clientPredicate(params));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Funil de vendas"
        subtitle="Arraste os cards entre as etapas. Soltar em 'Perdido' pede justificativa."
      />

      <FilterBar params={params} setParams={setParams} />

      <div className="min-h-0 flex-1">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && (
          <Board cards={cards} onOpenCard={setSelected} onRequestLose={setLoseTarget} />
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
