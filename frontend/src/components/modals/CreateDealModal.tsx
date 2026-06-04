import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import type { Pipeline, OpportunitySource } from "@/api/types";
import { useCreateDeal } from "@/api/mutations";
import { SOURCE_LABELS } from "@/lib/format";

interface Props {
  open: boolean;
  pipeline: Pipeline | null;
  onClose: () => void;
}

const SOURCES = Object.keys(SOURCE_LABELS) as OpportunitySource[];

export function CreateDealModal({ open, pipeline, onClose }: Props) {
  const create = useCreateDeal();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [item, setItem] = useState("");
  const [source, setSource] = useState<OpportunitySource>("manual");
  const [assigned, setAssigned] = useState("");
  const [stageId, setStageId] = useState<number | "">("");

  const openStages = (pipeline?.stages ?? []).filter((s) => s.category === "open");

  useEffect(() => {
    if (open) {
      setName(""); setPhone(""); setEmail(""); setValue(""); setItem("");
      setSource("manual"); setAssigned("");
      setStageId(openStages[0]?.id ?? "");
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pipeline?.id]);

  if (!open) return null;

  const invalid = !name.trim() || (!phone.trim() && !email.trim());

  async function submit() {
    if (invalid) return;
    await create.mutateAsync({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      value: value.trim() ? Number(value) : null,
      item_name: item.trim() || null,
      source,
      assigned_to: assigned.trim() || null,
      pipeline_id: pipeline?.id ?? null,
      stage_id: typeof stageId === "number" ? stageId : null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-primary" />
            <h2 className="font-semibold">Novo negócio{pipeline ? ` · ${pipeline.name}` : ""}</h2>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-2">
            <X size={18} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Nome *" full>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nome do cliente" />
          </Field>
          <Field label="Telefone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="E-mail">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="email@exemplo.com" />
          </Field>
          <Field label="Produto/Serviço">
            <input value={item} onChange={(e) => setItem(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Valor (R$)">
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} placeholder="0,00" />
          </Field>
          <Field label="Origem">
            <select value={source} onChange={(e) => setSource(e.target.value as OpportunitySource)} className={inputCls}>
              {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Responsável">
            <input value={assigned} onChange={(e) => setAssigned(e.target.value)} className={inputCls} placeholder="Vendedor" />
          </Field>
          <Field label="Etapa inicial" full>
            <select value={stageId} onChange={(e) => setStageId(Number(e.target.value))} className={inputCls}>
              {openStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>

        {create.isError && (
          <p className="px-4 text-xs text-danger">{(create.error as Error)?.message}</p>
        )}

        <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2">Cancelar</button>
          <button onClick={submit} disabled={invalid || create.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {create.isPending ? "Criando..." : "Criar negócio"}
          </button>
        </footer>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
