import type {
  OpportunityStatus,
  OpportunitySource,
  LeadScore,
  StallLevel,
  PostSaleStage,
  LostReason,
} from "@/api/types";

// ── Rótulos legíveis ──────────────────────────────────────────────────────────
export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  novo: "Novo",
  contato: "Em contato",
  proposta: "Proposta",
  visita_agendada: "Visita agendada",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

// Colunas do funil de vendas (ordem do kanban)
export const SALES_STAGES: OpportunityStatus[] = [
  "novo",
  "contato",
  "proposta",
  "visita_agendada",
  "negociacao",
  "fechado",
  "perdido",
];

export const POST_SALE_STAGES: PostSaleStage[] = [
  "producao",
  "separacao",
  "envio",
  "entregue",
  "pos_venda",
  "concluido",
];

export const POST_SALE_LABELS: Record<PostSaleStage, string> = {
  producao: "Produção",
  separacao: "Separação",
  envio: "Envio",
  entregue: "Entregue",
  pos_venda: "Pós-venda",
  concluido: "Concluído",
};

export const SOURCE_LABELS: Record<OpportunitySource, string> = {
  manual: "Manual",
  site: "Site",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
};

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  preco: "Preço",
  concorrente: "Concorrente",
  sem_resposta: "Sem resposta",
  timing: "Timing",
  sem_orcamento: "Sem orçamento",
  sem_interesse: "Sem interesse",
  curioso: "Curioso",
  outro: "Outro",
};

export const SCORE_META: Record<LeadScore, { label: string; emoji: string }> = {
  quente: { label: "Quente", emoji: "🔥" },
  morno: { label: "Morno", emoji: "🟡" },
  frio: { label: "Frio", emoji: "❄️" },
};

// Classe de cor do alerta de "lead parado"
export const STALL_CLASS: Record<StallLevel, string> = {
  ok: "",
  warning: "ring-2 ring-warning/60",
  danger: "ring-2 ring-danger/70",
};

// Borda lateral colorida por score (refino visual no card)
export const SCORE_BORDER: Record<LeadScore, string> = {
  quente: "border-l-4 border-l-danger",
  morno: "border-l-4 border-l-warning",
  frio: "border-l-4 border-l-muted",
};

// Progressão de etapas para a ação "avançar" (exclui "perdido").
const PROGRESSION: OpportunityStatus[] = [
  "novo",
  "contato",
  "proposta",
  "visita_agendada",
  "negociacao",
  "fechado",
];

export function nextStage(current: OpportunityStatus): OpportunityStatus | null {
  const idx = PROGRESSION.indexOf(current);
  if (idx === -1 || idx === PROGRESSION.length - 1) return null;
  return PROGRESSION[idx + 1];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Link wa.me — adiciona DDI 55 se faltar (números BR). */
export function whatsappLink(phone: string | null | undefined): string | null {
  let digits = onlyDigits(phone);
  if (!digits) return null;
  if (digits.length <= 11) digits = "55" + digits;
  return `https://wa.me/${digits}`;
}

export function formatPhone(phone: string | null | undefined): string {
  const d = onlyDigits(phone);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone ?? "—";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
