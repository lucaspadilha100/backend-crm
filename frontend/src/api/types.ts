// Tipos espelhando os schemas do backend (app/schemas/*.py).
// Mantê-los em sincronia com a API é essencial — sem mocks.

export type OpportunityStatus =
  | "novo"
  | "contato"
  | "proposta"
  | "visita_agendada"
  | "negociacao"
  | "fechado"
  | "perdido";

export type OpportunitySource =
  | "manual"
  | "site"
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "indicacao";

export type OpportunityLeadType =
  | "contato"
  | "produto"
  | "imovel"
  | "servico"
  | "orcamento";

export type LostReason =
  | "preco"
  | "concorrente"
  | "sem_resposta"
  | "timing"
  | "sem_orcamento"
  | "sem_interesse"
  | "curioso"
  | "outro";

export type PostSaleStage =
  | "producao"
  | "separacao"
  | "envio"
  | "entregue"
  | "pos_venda"
  | "concluido";

export type LeadScore = "quente" | "morno" | "frio";
export type StallLevel = "ok" | "warning" | "danger";

export type InteractionType =
  | "ligacao"
  | "whatsapp"
  | "email"
  | "reuniao"
  | "meet"
  | "visita"
  | "observacao"
  | "reentrada"
  | "sistema";

export interface Opportunity {
  id: number;
  contact_id: number;
  previous_opportunity_id: number | null;
  status: OpportunityStatus;
  source: OpportunitySource | null;
  lead_type: OpportunityLeadType | null;
  item_name: string | null;
  item_code: string | null;
  page_url: string | null;
  message: string | null;
  notes: string | null;
  assigned_to: string | null;
  is_repurchase: boolean;
  had_previous_purchase: boolean;
  reentry_count: number;
  value: number | null;
  lost_reason: LostReason | null;
  lost_observation: string | null;
  is_recoverable: boolean | null;
  lost_at: string | null;
  follow_up_at: string | null;
  archived: boolean | null;
  post_sale_stage: PostSaleStage | null;
  last_interaction_at: string | null;
  stage_changed_at: string | null;
  created_at: string;
  // calculados
  score: LeadScore;
  stall_level: StallLevel;
  days_since_interaction: number | null;
  days_in_stage: number | null;
}

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
}

export interface ContactBrief {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface BoardCard {
  opportunity: Opportunity;
  contact: ContactBrief;
}

export interface Interaction {
  id: number;
  opportunity_id: number;
  type: InteractionType;
  notes: string | null;
  user: string | null;
  created_at: string;
}

export interface OpportunityDetail {
  opportunity: Opportunity;
  contact: Contact;
  previous_opportunity: Opportunity | null;
  interactions: Interaction[];
}

export interface LostReasonCount {
  reason: string;
  count: number;
}

export interface StageCount {
  status: OpportunityStatus;
  count: number;
}

export interface DashboardMetrics {
  leads_received: number;
  active_opportunities: number;
  won_opportunities: number;
  lost_opportunities: number;
  conversion_rate: number;
  lost_reasons: LostReasonCount[];
  in_cadence: number;
  without_responsible: number;
  without_recent_interaction: number;
  pipeline_value: number;
  won_value: number;
  stage_counts: StageCount[];
}

export interface ContactSummary {
  contact: Contact;
  total_opportunities: number;
  purchases: number;
  total_value: number;
  reentries: number;
  is_returning: boolean;
  current_status: string | null;
  opportunities: Opportunity[];
  upcoming_cadences: Opportunity[];
}

export interface BoardFilters {
  status?: OpportunityStatus;
  source?: OpportunitySource;
  lead_type?: OpportunityLeadType;
  assigned_to?: string;
  unassigned?: boolean;
  recoverable?: boolean;
  archived?: boolean;
  follow_up_today?: boolean;
  is_repurchase?: boolean;
  pipeline?: "sales" | "post_sale";
  score?: LeadScore;
}
