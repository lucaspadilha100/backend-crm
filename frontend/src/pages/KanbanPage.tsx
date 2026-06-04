import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Settings2 } from "lucide-react";
import { useBoard, usePipelines } from "@/api/hooks";
import type { BoardCard, BoardFilters, LeadScore, OpportunitySource } from "@/api/types";
import { DynamicBoard } from "@/components/kanban/DynamicBoard";
import { FilterBar } from "@/components/kanban/FilterBar";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { LostModal } from "@/components/modals/LostModal";
import { CreateDealModal } from "@/components/modals/CreateDealModal";
import { PipelineSettingsModal } from "@/components/modals/PipelineSettingsModal";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";

function serverFilters(params: URLSearchParams, pipelineId: number | null): BoardFilters {
  const f: BoardFilters = {};
  if (pipelineId) f.pipeline_id = pipelineId;
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
  const { data: pipelines, isLoading: loadingPipes, isError: pipesError } = usePipelines();

  const [pipelineId, setPipelineId] = useState<number | null>(null);
  const current = pipelines?.find((p) => p.id === pipelineId) ?? pipelines?.[0] ?? null;
  const activePipelineId = current?.id ?? null;

  const filters = serverFilters(params, activePipelineId);
  const { data, isLoading, isError, error } = useBoard(filters);

  const [selected, setSelected] = useState<number | null>(null);
  const [loseTarget, setLoseTarget] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);

  const cards = (data ?? []).filter(clientPredicate(params));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Negócios"
        subtitle="Arraste os cards entre as etapas. Soltar em uma etapa de perda pede justificativa."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setManaging(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2"
            >
              <Settings2 size={15} /> Funis
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus size={15} /> Novo negócio
            </button>
          </div>
        }
      />

      {/* Abas de funil */}
      {pipelines && pipelines.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1 border-b border-border">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setPipelineId(p.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                activePipelineId === p.id
                  ? "border-primary font-medium text-text"
                  : "border-transparent text-muted hover:text-text"
              }`}
              style={activePipelineId === p.id ? { borderColor: p.color ?? "var(--color-primary)" } : undefined}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <FilterBar params={params} setParams={setParams} />

      <div className="min-h-0 flex-1">
        {(loadingPipes || isLoading) && <Loading />}
        {(pipesError || isError) && <ErrorState message={(error as Error)?.message} />}
        {current && data && (
          <DynamicBoard
            pipeline={current}
            cards={cards}
            onOpenCard={setSelected}
            onRequestLose={(id) => setLoseTarget(id)}
          />
        )}
      </div>

      <OpportunityDrawer
        opportunityId={selected}
        onClose={() => setSelected(null)}
        onRequestLose={setLoseTarget}
      />
      <LostModal opportunityId={loseTarget} onClose={() => setLoseTarget(null)} />
      <CreateDealModal open={creating} pipeline={current} onClose={() => setCreating(false)} />
      <PipelineSettingsModal open={managing} onClose={() => setManaging(false)} selectedPipelineId={activePipelineId} />
    </div>
  );
}
