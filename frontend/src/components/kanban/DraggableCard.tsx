import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { BoardCard } from "@/api/types";
import { KanbanCard } from "./Card";

interface Props {
  card: BoardCard;
  onOpen?: (opportunityId: number) => void;
}

/** Envolve o KanbanCard tornando-o arrastável. O clique continua funcionando
 *  graças à restrição de ativação por distância configurada no DndContext. */
export function DraggableCard({ card, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.opportunity.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard card={card} onOpen={onOpen} />
    </div>
  );
}
