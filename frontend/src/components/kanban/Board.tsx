import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { BoardCard, OpportunityStatus } from "@/api/types";
import { SALES_STAGES, STATUS_LABELS } from "@/lib/format";
import { useUpdateStatus } from "@/api/mutations";
import { Column } from "./Column";

interface Props {
  cards: BoardCard[];
  onOpenCard?: (opportunityId: number) => void;
  /** Disparado ao arrastar um card para "Perdido" (abre o modal obrigatório). */
  onRequestLose?: (opportunityId: number) => void;
}

export function Board({ cards, onOpenCard, onRequestLose }: Props) {
  const updateStatus = useUpdateStatus();

  // Distância de ativação evita que o clique (abrir drawer) vire arraste.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStatus = new Map<OpportunityStatus, BoardCard[]>();
  for (const stage of SALES_STAGES) byStatus.set(stage, []);
  for (const card of cards) {
    byStatus.get(card.opportunity.status)?.push(card);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const id = Number(active.id);
    const target = over.id as OpportunityStatus;
    const card = cards.find((c) => c.opportunity.id === id);
    if (!card || card.opportunity.status === target) return;

    if (target === "perdido") {
      onRequestLose?.(id); // perda exige justificativa → modal
      return;
    }
    updateStatus.mutate({ id, status: target });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="thin-scroll flex h-full gap-3 overflow-x-auto pb-2">
        {SALES_STAGES.map((stage) => (
          <Column
            key={stage}
            droppableId={stage}
            draggable
            title={STATUS_LABELS[stage]}
            cards={byStatus.get(stage) ?? []}
            accent={
              stage === "fechado"
                ? "success"
                : stage === "perdido"
                  ? "danger"
                  : "default"
            }
            onOpenCard={onOpenCard}
          />
        ))}
      </div>
    </DndContext>
  );
}
