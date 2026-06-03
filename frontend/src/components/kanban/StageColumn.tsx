import { useDroppable } from "@dnd-kit/core";
import type { BoardCard, Stage } from "@/api/types";
import { DraggableCard } from "./DraggableCard";
import { formatMoney } from "@/lib/format";

interface Props {
  stage: Stage;
  cards: BoardCard[];
  onOpenCard?: (opportunityId: number) => void;
}

export function StageColumn({ stage, cards, onOpenCard }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage.id}` });
  const color = stage.color ?? "var(--color-primary)";
  const total = cards.reduce((s, c) => s + (c.opportunity.value ?? 0), 0);
  const variant = stage.category === "open" ? "sales" : "post_sale";

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-72 shrink-0 flex-col rounded-xl bg-surface-2/50 transition ${
        isOver ? "ring-2 ring-primary/60" : ""
      }`}
    >
      {/* Cabeçalho colorido */}
      <div
        className="rounded-t-xl border-t-[3px] px-3 py-2.5"
        style={{ borderTopColor: color }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-semibold">{stage.name}</h3>
          </div>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
            {cards.length}
          </span>
        </div>
        {total > 0 && (
          <div className="mt-1 text-[11px] font-medium text-success">{formatMoney(total)}</div>
        )}
      </div>

      <div className="thin-scroll flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-2">
        {cards.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted">Vazio</p>
        ) : (
          cards.map((card) => (
            <DraggableCard
              key={card.opportunity.id}
              card={card}
              onOpen={onOpenCard}
              variant={variant}
            />
          ))
        )}
      </div>
    </div>
  );
}
