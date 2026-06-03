import { MessageCircle, Repeat, Phone, Crown, Tag } from "lucide-react";
import type { BoardCard } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import {
  SCORE_META,
  SOURCE_LABELS,
  STALL_CLASS,
  formatPhone,
  whatsappLink,
} from "@/lib/format";

interface Props {
  card: BoardCard;
  onOpen?: (opportunityId: number) => void;
}

/**
 * Card do kanban — mostra tudo que o atendente precisa para agir SEM abrir o
 * drawer: nome, telefone (clique → WhatsApp), produto, origem, responsável,
 * recompra, reentradas, cliente antigo, score e alerta de parado.
 */
export function KanbanCard({ card, onOpen }: Props) {
  const { opportunity: o, contact } = card;
  const wa = whatsappLink(contact.phone);
  const score = SCORE_META[o.score];

  return (
    <div
      onClick={() => onOpen?.(o.id)}
      className={`cursor-pointer rounded-lg border border-border bg-surface p-3 shadow-sm transition hover:shadow-md ${STALL_CLASS[o.stall_level]}`}
    >
      {/* Cabeçalho: nome + score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-text">
          {(o.is_repurchase || o.had_previous_purchase) && (
            <Crown size={14} className="shrink-0 text-warning" />
          )}
          <span className="line-clamp-1">{contact.name}</span>
        </div>
        <span title={score.label} className="shrink-0 text-sm leading-none">
          {score.emoji}
        </span>
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
      </div>

      {/* Rodapé: responsável */}
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted">
        <span className="line-clamp-1">
          {o.assigned_to ? o.assigned_to : "Sem responsável"}
        </span>
        {o.days_since_interaction != null && (
          <span title="Dias sem interação">{o.days_since_interaction}d</span>
        )}
      </div>
    </div>
  );
}
