import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { BoardCard, Pipeline } from "@/api/types";
import { useMoveOpportunity } from "@/api/mutations";
import { StageColumn } from "./StageColumn";

interface Props {
  pipeline: Pipeline;
  cards: BoardCard[];
  onOpenCard?: (opportunityId: number) => void;
  /** Disparado ao soltar um card numa etapa "perdido" (abre o modal). */
  onRequestLose?: (opportunityId: number, stageId: number) => void;
}

export function DynamicBoard({ pipeline, cards, onOpenCard, onRequestLose }: Props) {
  const move = useMoveOpportunity();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const stages = [...pipeline.stages].sort((a, b) => a.position - b.position);
  const byStage = new Map<number, BoardCard[]>();
  for (const s of stages) byStage.set(s.id, []);
  for (const card of cards) {
    if (card.opportunity.stage_id != null && byStage.has(card.opportunity.stage_id)) {
      byStage.get(card.opportunity.stage_id)!.push(card);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const id = Number(active.id);
    const overId = String(over.id);
    if (!overId.startsWith("stage:")) return;
    const stageId = Number(overId.slice("stage:".length));
    const card = cards.find((c) => c.opportunity.id === id);
    if (!card || card.opportunity.stage_id === stageId) return;

    const targetStage = stages.find((s) => s.id === stageId);
    if (targetStage?.category === "lost") {
      onRequestLose?.(id, stageId); // perda exige justificativa
      return;
    }
    move.mutate({ id, stage_id: stageId });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="thin-scroll flex h-full gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            cards={byStage.get(stage.id) ?? []}
            onOpenCard={onOpenCard}
          />
        ))}
      </div>
    </DndContext>
  );
}
