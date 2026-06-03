import { useState } from "react";
import {
  MessageCircle,
  ChevronRight,
  PhoneCall,
  CalendarClock,
  Check,
} from "lucide-react";
import type { BoardCard } from "@/api/types";
import {
  useUpdateStatus,
  useCreateInteraction,
  useScheduleFollowUp,
} from "@/api/mutations";
import { nextStage, whatsappLink } from "@/lib/format";

/** Ações rápidas diretamente no card — reduzem cliques (sem abrir o drawer). */
export function CardActions({ card }: { card: BoardCard }) {
  const { opportunity: o, contact } = card;
  const advance = useUpdateStatus();
  const registerContact = useCreateInteraction();
  const scheduleFollowUp = useScheduleFollowUp();

  const [showFollowUp, setShowFollowUp] = useState(false);
  const [date, setDate] = useState("");
  const [justRegistered, setJustRegistered] = useState(false);

  const wa = whatsappLink(contact.phone);
  const next = nextStage(o.status);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  function handleRegister(e: React.MouseEvent) {
    stop(e);
    registerContact.mutate(
      {
        opportunity_id: o.id,
        type: "whatsapp",
        notes: "Contato registrado (ação rápida).",
      },
      {
        onSuccess: () => {
          setJustRegistered(true);
          setTimeout(() => setJustRegistered(false), 1500);
        },
      }
    );
  }

  function handleAdvance(e: React.MouseEvent) {
    stop(e);
    if (next) advance.mutate({ id: o.id, status: next });
  }

  function confirmFollowUp(e: React.MouseEvent) {
    stop(e);
    if (!date) return;
    scheduleFollowUp.mutate(
      { id: o.id, follow_up_at: new Date(date).toISOString() },
      { onSuccess: () => setShowFollowUp(false) }
    );
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-1">
        <ActionBtn
          title="Abrir WhatsApp"
          disabled={!wa}
          onClick={(e) => {
            stop(e);
            if (wa) window.open(wa, "_blank");
          }}
          tone="success"
        >
          <MessageCircle size={14} />
        </ActionBtn>

        <ActionBtn
          title={justRegistered ? "Registrado!" : "Registrar contato"}
          onClick={handleRegister}
          disabled={registerContact.isPending}
        >
          {justRegistered ? <Check size={14} /> : <PhoneCall size={14} />}
        </ActionBtn>

        <ActionBtn
          title="Agendar follow-up"
          onClick={(e) => {
            stop(e);
            setShowFollowUp(true);
          }}
        >
          <CalendarClock size={14} />
        </ActionBtn>

        <ActionBtn
          title={next ? "Avançar etapa" : "Sem próxima etapa"}
          onClick={handleAdvance}
          disabled={!next || advance.isPending}
          tone="primary"
        >
          <ChevronRight size={14} />
        </ActionBtn>
      </div>

      {/* Mini-modal de follow-up (fixo para não ser cortado pela coluna) */}
      {showFollowUp && (
        <div
          onClick={(e) => {
            stop(e);
            setShowFollowUp(false);
          }}
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4"
        >
          <div
            onClick={stop}
            className="w-full max-w-xs rounded-xl border border-border bg-surface p-4 shadow-2xl"
          >
            <h4 className="mb-2 text-sm font-semibold">Agendar follow-up</h4>
            <p className="mb-2 text-xs text-muted">{contact.name}</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={(e) => {
                  stop(e);
                  setShowFollowUp(false);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
              >
                Cancelar
              </button>
              <button
                onClick={confirmFollowUp}
                disabled={!date || scheduleFollowUp.isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  tone?: "default" | "success" | "primary";
}) {
  const tones = {
    default: "text-muted hover:bg-surface-2 hover:text-text",
    success: "text-success hover:bg-success/10",
    primary: "text-primary hover:bg-primary/10",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-7 w-7 place-items-center rounded-md transition disabled:opacity-30 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
