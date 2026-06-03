import { MessageCircle, Repeat, Phone, Crown, Tag, CalendarClock, DollarSign } from "lucide-react";
import type { BoardCard } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { CardActions } from "./CardActions";
import {
  SCORE_META,
  SCORE_BORDER,
  SOURCE_LABELS,
  STALL_CLASS,
  formatPhone,
  formatDate,
  formatMoney,
  whatsappLink,
} from "@/lib/format";

type Variant = "sales" | "post_sale";

interface Props {
  card: BoardCard;
  onOpen?: (opportunityId: number) => void;
  variant?: Variant;
}

/**
 * Card do kanban. Variante "sales" (funil) mostra score, SLA e ações rápidas.
 * Variante "post_sale" foca em valor e tempo na etapa de operação.
 */
export function KanbanCard({ card, onOpen, variant = "sales" }: Props) {
  const { opportunity: o, contact } = card;
  const wa = whatsappLink(contact.phone);
  const score = SCORE_META[o.score];
  const isSales = variant === "sales";

  return (
    <div
      onClick={() => onOpen?.(o.id)}
      className={`cursor-pointer rounded-lg border border-border bg-surface p-3 shadow-sm transition hover:shadow-md ${
        isSales ? `${SCORE_BORDER[o.score]} ${STALL_CLASS[o.stall_level]}` : ""
      }`}
    >
      {/* Cabeçalho: nome + score (só no funil) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-text">
          {(o.is_repurchase || o.had_previous_purchase) && (
            <Crown size={14} className="shrink-0 text-warning" />
          )}
          <span className="line-clamp-1">{contact.name}</span>
        </div>
        {isSales && (
          <span title={score.label} className="shrink-0 text-sm leading-none">
            {score.emoji}
          </span>
        )}
      </div>

      {/* Telefone clicável → WhatsApp */}
      {contact.phone && (
        <div className="mt-1.5 flex items-center gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-success hover:underline"
            >
              <MessageCircle size={13} />
              {formatPhone(contact.phone)}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Phone size={13} />
              {formatPhone(contact.phone)}
            </span>
          )}
        </div>
      )}

      {/* Produto/serviço desejado */}
      {o.item_name && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted">
          <Tag size={12} className="shrink-0" />
          <span className="line-clamp-1">{o.item_name}</span>
        </div>
      )}

      {isSales ? (
        <>
          {/* Selos */}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {o.source && <Badge variant="muted">{SOURCE_LABELS[o.source]}</Badge>}
            {(o.is_repurchase || o.had_previous_purchase) && (
              <Badge variant="warning" title="Cliente recorrente">
                <Crown size={11} /> Recompra
              </Badge>
            )}
            {o.reentry_count > 0 && (
              <Badge variant="primary" title="Reentradas no funil">
                <Repeat size={11} /> {o.reentry_count}
              </Badge>
            )}
            {o.stall_level === "warning" && <Badge variant="warning">Parado +2d</Badge>}
            {o.stall_level === "danger" && <Badge variant="danger">Parado +5d</Badge>}
            {o.follow_up_at && (
              <Badge variant="primary" title="Follow-up agendado">
                <CalendarClock size={11} /> {formatDate(o.follow_up_at)}
              </Badge>
            )}
          </div>

          {/* Rodapé: responsável + dias sem interação */}
          <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted">
            <span className="line-clamp-1">
              {o.assigned_to ? o.assigned_to : "Sem responsável"}
            </span>
            {o.days_since_interaction != null && (
              <span title="Dias sem interação">{o.days_since_interaction}d</span>
            )}
          </div>

          {/* Ações rápidas */}
          <CardActions card={card} />
        </>
      ) : (
        <>
          {/* Pós-venda: valor + tempo na etapa */}
          <div className="mt-2.5 flex items-center gap-1 text-sm font-semibold text-success">
            <DollarSign size={14} /> {formatMoney(o.value)}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted">
            <span className="line-clamp-1">
              {o.assigned_to ? o.assigned_to : "Sem responsável"}
            </span>
            {o.days_in_stage != null && (
              <span title="Dias nesta etapa">{o.days_in_stage}d na etapa</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
