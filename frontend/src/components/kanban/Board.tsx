import type { BoardCard, OpportunityStatus } from "@/api/types";
import { SALES_STAGES, STATUS_LABELS } from "@/lib/format";
import { Column } from "./Column";

interface Props {
  cards: BoardCard[];
  onOpenCard?: (opportunityId: number) => void;
}

export function Board({ cards, onOpenCard }: Props) {
  const byStatus = new Map<OpportunityStatus, BoardCard[]>();
  for (const stage of SALES_STAGES) byStatus.set(stage, []);
  for (const card of cards) {
    const list = byStatus.get(card.opportunity.status);
    if (list) list.push(card);
  }

  return (
    <div className="thin-scroll flex h-full gap-3 overflow-x-auto pb-2">
      {SALES_STAGES.map((stage) => (
        <Column
          key={stage}
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
  );
}
