import {
  Inbox,
  Activity,
  Trophy,
  XCircle,
  Percent,
  RotateCcw,
  UserX,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { useDashboard } from "@/api/hooks";
import { Loading, ErrorState, PageHeader } from "@/components/ui/States";
import { LOST_REASON_LABELS } from "@/lib/format";
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Metric icon={Inbox} label="Leads recebidos" value={data.leads_received} />
              <Metric icon={Activity} label="Oportunidades ativas" value={data.active_opportunities} />
              <Metric icon={Trophy} label="Ganhas" value={data.won_opportunities} accent="success" />
              <Metric icon={XCircle} label="Perdidas" value={data.lost_opportunities} accent="danger" />
              <Metric icon={Percent} label="Conversão" value={`${data.conversion_rate}%`} accent="primary" />
              <Metric icon={RotateCcw} label="Em cadência" value={data.in_cadence} />
              <Metric icon={UserX} label="Sem responsável" value={data.without_responsible} accent="warning" />
              <Metric icon={Clock} label="Sem interação recente" value={data.without_recent_interaction} accent="warning" />
            </div>

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

function Metric({
  icon: Icon,
  label,
  value,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Icon size={18} className={ACCENTS[accent]} />
      <div className={`mt-2 text-2xl font-bold ${ACCENTS[accent]}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
