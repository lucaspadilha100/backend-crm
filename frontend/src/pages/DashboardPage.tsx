import { Link } from "react-router-dom";
import {
  Inbox,
  Activity,
  Percent,
  DollarSign,
  Trophy,
  AlertTriangle,
  RotateCcw,
  UserX,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useDashboard } from "@/api/hooks";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";
import { LOST_REASON_LABELS, STATUS_LABELS, formatMoney } from "@/lib/format";
import type { LostReason } from "@/api/types";

export function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Dashboard" subtitle="Indicadores operacionais em tempo real." />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <Loading />}
        {isError && <ErrorState message={(error as Error)?.message} />}
        {data && (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={Inbox} label="Leads recebidos" value={data.leads_received} />
              <Kpi icon={Activity} label="Oportunidades ativas" value={data.active_opportunities} />
              <Kpi icon={Percent} label="Conversão" value={`${data.conversion_rate}%`} accent="primary" />
              <Kpi icon={DollarSign} label="Em negociação" value={formatMoney(data.pipeline_value)} />
            </div>

            {/* Atenção agora (navegável) */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Atenção agora</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <AttentionCard
                  to="/parados"
                  icon={AlertTriangle}
                  label="Sem interação recente"
                  value={data.without_recent_interaction}
                  accent="warning"
                />
                <AttentionCard
                  to="/reativacao"
                  icon={RotateCcw}
                  label="Para reativar (cadência)"
                  value={data.in_cadence}
                  accent="primary"
                />
                <AttentionCard
                  to="/?unassigned=true"
                  icon={UserX}
                  label="Sem responsável"
                  value={data.without_responsible}
                  accent="danger"
                />
              </div>
            </div>

            {/* Funil + Resultado */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
                <h3 className="mb-3 text-sm font-semibold">Funil por etapa</h3>
                <Funnel counts={data.stage_counts} />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <ResultCard icon={Trophy} label="Ganhas" value={data.won_opportunities} accent="success" />
                <ResultCard icon={DollarSign} label="Valor ganho" value={formatMoney(data.won_value)} accent="success" />
                <ResultCard icon={AlertTriangle} label="Perdidas" value={data.lost_opportunities} accent="danger" />
              </div>
            </div>

            {/* Motivos de perda */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold">Motivos de perda</h3>
              {data.lost_reasons.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma perda registrada ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {data.lost_reasons.map((r) => {
                    const total = data.lost_reasons.reduce((s, x) => s + x.count, 0);
                    const pct = total ? Math.round((r.count / total) * 100) : 0;
                    return (
                      <li key={r.reason}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{LOST_REASON_LABELS[r.reason as LostReason] ?? r.reason}</span>
                          <span className="text-muted">{r.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full bg-danger" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ACCENTS = {
  default: "text-text",
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
} as const;
type Accent = keyof typeof ACCENTS;

function Kpi({
  icon: Icon,
  label,
  value,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: Accent;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Icon size={18} className={ACCENTS[accent]} />
      <div className={`mt-2 text-2xl font-bold ${ACCENTS[accent]}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: Accent;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <Icon size={20} className={ACCENTS[accent]} />
      <div>
        <div className={`text-lg font-bold ${ACCENTS[accent]}`}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function AttentionCard({
  to,
  icon: Icon,
  label,
  value,
  accent,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  value: number;
  accent: Accent;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={ACCENTS[accent]} />
        <div>
          <div className={`text-xl font-bold ${ACCENTS[accent]}`}>{value}</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </div>
      <ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function Funnel({ counts }: { counts: { status: string; count: number }[] }) {
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <div className="space-y-2">
      {counts.map((c) => {
        const pct = Math.round((c.count / max) * 100);
        const isLost = c.status === "perdido";
        const isWon = c.status === "fechado";
        return (
          <div key={c.status} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs text-muted">
              {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] ?? c.status}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-surface-2">
              <div
                className={`h-full ${isWon ? "bg-success" : isLost ? "bg-danger" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium">{c.count}</span>
          </div>
        );
      })}
    </div>
  );
}
