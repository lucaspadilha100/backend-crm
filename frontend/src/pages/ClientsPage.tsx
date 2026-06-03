import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/States";

export function ClientsPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Clientes" subtitle="Visão 360 do relacionamento." />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted">
        <Users size={28} />
        <p className="max-w-md text-sm">
          A visão completa do cliente (oportunidades anteriores, compras, valor
          gerado, reentradas e cadências futuras) entra na fase de Cliente 360.
        </p>
        <p className="text-xs">
          O backend já expõe <code className="text-text">GET /contacts/&#123;id&#125;/summary</code> — a tela consumirá esse endpoint.
        </p>
      </div>
    </div>
  );
}
