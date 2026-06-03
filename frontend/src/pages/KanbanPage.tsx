import { useState } from "react";
import { useBoard } from "@/api/hooks";
import { Board } from "@/components/kanban/Board";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";

export function KanbanPage() {
  const { data, isLoading, isError, error } = useBoard();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Funil de vendas"
        subtitle="Arraste e solte virá na próxima fase. Clique no card para ver detalhes."
      />
      <div className="min-h-0 flex-1">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && <Board cards={data} onOpenCard={setSelected} />}
      </div>
      <OpportunityDrawer opportunityId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
