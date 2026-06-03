// Hooks de mutação (escrita). Cada um invalida as queries afetadas para a UI
// refletir o estado real imediatamente. Tudo bate na API existente — sem mocks.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Opportunity,
  OpportunityStatus,
  PostSaleStage,
  LostReason,
  InteractionType,
  Interaction,
} from "./types";

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    for (const key of [
      "board",
      "reactivation",
      "stalled",
      "dashboard",
      "opportunity",
      "contact-summary",
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useUpdateStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; status: OpportunityStatus }) =>
      api.put<Opportunity>(`/opportunities/${vars.id}/status`, {
        status: vars.status,
      }),
    onSuccess: invalidate,
  });
}

export interface LosePayload {
  reason: LostReason;
  observation?: string | null;
  is_recoverable: boolean;
  follow_up_at?: string | null;
}

export function useLoseOpportunity() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; data: LosePayload }) =>
      api.put<Opportunity>(`/opportunities/${vars.id}/lose`, vars.data),
    onSuccess: invalidate,
  });
}

export function useReactivate() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; status?: OpportunityStatus; notes?: string }) =>
      api.post<Opportunity>(`/opportunities/${vars.id}/reactivate`, {
        status: vars.status ?? "novo",
        notes: vars.notes ?? null,
      }),
    onSuccess: invalidate,
  });
}

export function useAssign() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; assigned_to: string | null }) =>
      api.put<Opportunity>(`/opportunities/${vars.id}/assign`, {
        assigned_to: vars.assigned_to,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateNotes() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; notes: string | null }) =>
      api.put<Opportunity>(`/opportunities/${vars.id}/notes`, { notes: vars.notes }),
    onSuccess: invalidate,
  });
}

export function useUpdateValue() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; value: number | null }) =>
      api.put<Opportunity>(`/opportunities/${vars.id}/value`, { value: vars.value }),
    onSuccess: invalidate,
  });
}

export function useUpdatePostSaleStage() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; post_sale_stage: PostSaleStage }) =>
      api.put<Opportunity>(`/opportunities/${vars.id}/post-sale-stage`, {
        post_sale_stage: vars.post_sale_stage,
      }),
    onSuccess: invalidate,
  });
}

export function useScheduleFollowUp() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; follow_up_at: string | null }) =>
      api.put<Opportunity>(`/opportunities/${vars.id}/follow-up`, {
        follow_up_at: vars.follow_up_at,
      }),
    onSuccess: invalidate,
  });
}

export function useCreateInteraction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: {
      opportunity_id: number;
      type: InteractionType;
      notes?: string | null;
      user?: string | null;
    }) => api.post<Interaction>("/interactions", vars),
    onSuccess: invalidate,
  });
}
