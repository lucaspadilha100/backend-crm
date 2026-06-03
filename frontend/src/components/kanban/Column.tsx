import { useDroppable } from "@dnd-kit/core";
import type { BoardCard } from "@/api/types";
import { KanbanCard } from "./Card";
import { DraggableCard } from "./DraggableCard";

interface Props {
  title: string;
  cards: BoardCard[];
  accent?: "default" | "success" | "danger";
  onOpenCard?: (opportunityId: number) => void;
  /** Quando definido, a coluna vira área de drop (id = status/etapa). */
  droppableId?: string;
  /** Quando true, os cards podem ser arrastados. */
  draggable?: boolean;
  /** Aparência do card. */
  variant?: "sales" | "post_sale";
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  default: "text-text",
  success: "text-success",
  danger: "text-danger",
};

export function Column({
  title,
  cards,
  accent = "default",
  onOpenCard,
  droppableId,
  draggable = false,
  variant = "sales",
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId ?? title,
    disabled: !droppableId,
  });

  return (
    <div
      ref={droppableId ? setNodeRef : undefined}
      className={`flex h-full w-72 shrink-0 flex-col rounded-xl bg-surface-2/60 transition ${
        isOver ? "ring-2 ring-primary/50" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className={`text-sm font-semibold ${ACCENT[accent]}`}>{title}</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
          {cards.length}
        </span>
      </div>
      <div className="thin-scroll flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted">Vazio</p>
        ) : (
          cards.map((card) =>
            draggable ? (
              <DraggableCard
                key={card.opportunity.id}
                card={card}
                onOpen={onOpenCard}
                variant={variant}
              />
            ) : (
              <KanbanCard
                key={card.opportunity.id}
                card={card}
                onOpen={onOpenCard}
                variant={variant}
              />
            )
          )
        )}
      </div>
    </div>
  );
}
