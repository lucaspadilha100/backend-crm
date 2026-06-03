import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { usePostSaleBoard } from "@/api/hooks";
import { useUpdatePostSaleStage } from "@/api/mutations";
import type { BoardCard, PostSaleStage } from "@/api/types";
import { Column } from "@/components/kanban/Column";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";
import { POST_SALE_STAGES, POST_SALE_LABELS } from "@/lib/format";

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = Number(active.id);
    const target = over.id as PostSaleStage;
    const card = (data ?? []).find((c) => c.opportunity.id === id);
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
