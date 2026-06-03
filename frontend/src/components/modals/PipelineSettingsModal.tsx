import { useState } from "react";
import { X, Plus, Trash2, ChevronUp, ChevronDown, Settings2 } from "lucide-react";
import type { Pipeline, Stage, StageCategory } from "@/api/types";
import { usePipelines } from "@/api/hooks";
import {
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
} from "@/api/mutations";

const CATEGORY_LABELS: Record<StageCategory, string> = {
  open: "Em aberto",
  won: "Ganho",
  lost: "Perdido",
};

export function PipelineSettingsModal({
  open,
  onClose,
  selectedPipelineId,
}: {
  open: boolean;
  onClose: () => void;
  selectedPipelineId: number | null;
}) {
  const { data: pipelines } = usePipelines();
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();
  const [selId, setSelId] = useState<number | null>(selectedPipelineId);
  const [newPipeline, setNewPipeline] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const current = pipelines?.find((p) => p.id === (selId ?? selectedPipelineId)) ?? pipelines?.[0] ?? null;

  async function addPipeline() {
    if (!newPipeline.trim()) return;
    const created = await createPipeline.mutateAsync({ name: newPipeline.trim() });
    setNewPipeline("");
    setSelId(created.id);
  }

  async function removePipeline(p: Pipeline) {
    setError(null);
    try {
      await deletePipeline.mutateAsync(p.id);
      setSelId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-primary" />
            <h2 className="font-semibold">Gerenciar funis</h2>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-2">
            <X size={18} />
          </button>
        </header>

        {error && <p className="border-b border-border bg-danger/10 px-4 py-2 text-xs text-danger">{error}</p>}

        <div className="grid min-h-0 flex-1 grid-cols-[16rem_1fr]">
          {/* Lista de funis */}
          <div className="flex min-h-0 flex-col border-r border-border">
            <div className="thin-scroll flex-1 overflow-y-auto p-2">
              {pipelines?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelId(p.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    current?.id === p.id ? "bg-surface-2 font-medium" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color ?? "var(--color-primary)" }} />
                  <span className="line-clamp-1 flex-1">{p.name}</span>
                  {p.is_default && <span className="text-[10px] text-muted">padrão</span>}
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <div className="flex gap-1">
                <input
                  value={newPipeline}
                  onChange={(e) => setNewPipeline(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPipeline()}
                  placeholder="Novo funil"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                />
                <button onClick={addPipeline} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Detalhe do funil */}
          <div className="thin-scroll min-h-0 overflow-y-auto p-4">
            {current ? (
              <PipelineEditor
                pipeline={current}
                onRename={(name) => updatePipeline.mutate({ id: current.id, name })}
                onColor={(color) => updatePipeline.mutate({ id: current.id, color })}
                onDelete={() => removePipeline(current)}
              />
            ) : (
              <p className="text-sm text-muted">Selecione ou crie um funil.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineEditor({
  pipeline,
  onRename,
  onColor,
  onDelete,
}: {
  pipeline: Pipeline;
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}) {
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorder = useReorderStages();
  const [name, setName] = useState(pipeline.name);
  const [newStage, setNewStage] = useState("");

  const stages = [...pipeline.stages].sort((a, b) => a.position - b.position);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const ids = stages.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate({ pipeline_id: pipeline.id, ids });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted">Nome do funil</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== pipeline.name && onRename(name.trim())}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Cor</label>
          <input
            type="color"
            value={pipeline.color ?? "#4f46e5"}
            onChange={(e) => onColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-border bg-surface"
          />
        </div>
        {!pipeline.is_default && (
          <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-lg border border-danger/40 text-danger hover:bg-danger/10">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Etapas</h4>
        <div className="space-y-2">
          {stages.map((stage, i) => (
            <StageRow
              key={stage.id}
              stage={stage}
              canDelete={stages.length > 1}
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
              onRename={(n) => updateStage.mutate({ id: stage.id, name: n })}
              onColor={(c) => updateStage.mutate({ id: stage.id, color: c })}
              onCategory={(cat) => updateStage.mutate({ id: stage.id, category: cat })}
              onDelete={() => deleteStage.mutate(stage.id)}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          <input
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newStage.trim()) {
                createStage.mutate({ pipeline_id: pipeline.id, name: newStage.trim(), category: "open" });
                setNewStage("");
              }
            }}
            placeholder="Nova etapa"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (newStage.trim()) {
                createStage.mutate({ pipeline_id: pipeline.id, name: newStage.trim(), category: "open" });
                setNewStage("");
              }
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StageRow({
  stage,
  canDelete,
  onUp,
  onDown,
  onRename,
  onColor,
  onCategory,
  onDelete,
}: {
  stage: Stage;
  canDelete: boolean;
  onUp: () => void;
  onDown: () => void;
  onRename: (n: string) => void;
  onColor: (c: string) => void;
  onCategory: (c: StageCategory) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(stage.name);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
      <div className="flex flex-col">
        <button onClick={onUp} className="text-muted hover:text-text"><ChevronUp size={14} /></button>
        <button onClick={onDown} className="text-muted hover:text-text"><ChevronDown size={14} /></button>
      </div>
      <input type="color" value={stage.color ?? "#6366f1"} onChange={(e) => onColor(e.target.value)} className="h-7 w-8 shrink-0 cursor-pointer rounded border border-border" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== stage.name && onRename(name.trim())}
        className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <select value={stage.category} onChange={(e) => onCategory(e.target.value as StageCategory)} className="shrink-0 rounded-md border border-border bg-surface px-2 py-1.5 text-xs">
        {(["open", "won", "lost"] as StageCategory[]).map((c) => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>
      <button onClick={onDelete} disabled={!canDelete} className="grid h-7 w-7 shrink-0 place-items-center rounded text-danger hover:bg-danger/10 disabled:opacity-30">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
