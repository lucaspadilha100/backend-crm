import { useState } from "react";
import { usePostSaleBoard } from "@/api/hooks";
import type { BoardCard, PostSaleStage } from "@/api/types";
import { Column } from "@/components/kanban/Column";
import { OpportunityDrawer } from "@/components/drawer/OpportunityDrawer";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";
import { POST_SALE_STAGES, POST_SALE_LABELS } from "@/lib/format";

export function PostSalePage() {
  const { data, isLoading, isError, error } = usePostSaleBoard();
  const [selected, setSelected] = useState<number | null>(null);

  const byStage = new Map<PostSaleStage | "sem_etapa", BoardCard[]>();
  for (const stage of POST_SALE_STAGES) byStage.set(stage, []);
  for (const card of data ?? []) {
    const key = card.opportunity.post_sale_stage ?? "producao";
    byStage.get(key)?.push(card);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Pós-venda"
        subtitle="Operações após o fechamento: produção → entrega → conclusão."
      />
      <div className="min-h-0 flex-1">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && (
          <div className="thin-scroll flex h-full gap-3 overflow-x-auto pb-2">
            {POST_SALE_STAGES.map((stage) => (
              <Column
                key={stage}
                title={POST_SALE_LABELS[stage]}
                cards={byStage.get(stage) ?? []}
                accent={stage === "concluido" ? "success" : "default"}
                onOpenCard={setSelected}
              />
            ))}
          </div>
        )}
      </div>
      <OpportunityDrawer opportunityId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
