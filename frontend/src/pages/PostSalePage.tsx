import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { DollarSign, Loader, PackageCheck } from "lucide-react";
import { usePostSaleBoard } from "@/api/hooks";
import { useUpdatePostSaleStage } from "@/api/mutations";
import type { BoardCard, PostSaleStage } from "@/api/types";
import { Column } from "@/components/kanban/Column";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";
import { POST_SALE_STAGES, POST_SALE_LABELS, formatMoney } from "@/lib/format";

export function PostSalePage() {
  const { data, isLoading, isError, error } = usePostSaleBoard();
  const updateStage = useUpdatePostSaleStage();
  const [selected, setSelected] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStage = new Map<PostSaleStage, BoardCard[]>();
  for (const stage of POST_SALE_STAGES) byStage.set(stage, []);
  for (const card of data ?? []) {
    const key = (card.opportunity.post_sale_stage ?? "producao") as PostSaleStage;
    byStage.get(key)?.push(card);
  }

  const cards = data ?? [];
  const totalValue = cards.reduce((s, c) => s + (c.opportunity.value ?? 0), 0);
  const concluded = byStage.get("concluido")?.length ?? 0;
  const inProgress = cards.length - concluded;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = Number(active.id);
    const target = over.id as PostSaleStage;
    const card = cards.find((c) => c.opportunity.id === id);
    const current = card?.opportunity.post_sale_stage ?? "producao";
    if (!card || current === target) return;
    updateStage.mutate({ id, post_sale_stage: target });
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Pós-venda"
        subtitle="Operações após o fechamento. Arraste entre as etapas."
      />

      {data && (
        <div className="mb-3 grid grid-cols-3 gap-3">
          <Indicator icon={DollarSign} label="Valor em operação" value={formatMoney(totalValue)} accent="text-success" />
          <Indicator icon={Loader} label="Em andamento" value={inProgress} accent="text-primary" />
          <Indicator icon={PackageCheck} label="Concluídos" value={concluded} accent="text-success" />
        </div>
      )}

      <div className="min-h-0 flex-1">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="thin-scroll flex h-full gap-3 overflow-x-auto pb-2">
              {POST_SALE_STAGES.map((stage) => (
                <Column
                  key={stage}
                  droppableId={stage}
                  draggable
                  variant="post_sale"
                  title={POST_SALE_LABELS[stage]}
                  cards={byStage.get(stage) ?? []}
                  accent={stage === "concluido" ? "success" : "default"}
                  onOpenCard={setSelected}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>
      <OpportunityDrawer opportunityId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Indicator({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof DollarSign;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <Icon size={20} className={accent} />
      <div>
        <div className={`text-lg font-bold ${accent}`}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
