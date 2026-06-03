import { useState } from "react";
import { useBoard } from "@/api/hooks";
import { Board } from "@/components/kanban/Board";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { LostModal } from "@/components/modals/LostModal";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";

export function KanbanPage() {
  const { data, isLoading, isError, error } = useBoard();
  const [selected, setSelected] = useState<number | null>(null);
  const [loseTarget, setLoseTarget] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Funil de vendas"
        subtitle="Arraste os cards entre as etapas. Soltar em 'Perdido' pede justificativa."
      />
      <div className="min-h-0 flex-1">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && (
          <Board cards={data} onOpenCard={setSelected} onRequestLose={setLoseTarget} />
        )}
      </div>

      <OpportunityDrawer
        opportunityId={selected}
        onClose={() => setSelected(null)}
        onRequestLose={setLoseTarget}
      />
      <LostModal opportunityId={loseTarget} onClose={() => setLoseTarget(null)} />
    </div>
  );
}
