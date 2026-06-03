// React Query hooks por recurso. Centralizam as chamadas à API.
import { useQuery } from "@tanstack/react-query";
import { api, buildQuery } from "./client";
import type {
  BoardCard,
  BoardFilters,
  DashboardMetrics,
  OpportunityDetail,
  ContactSummary,
  Contact,
  Pipeline,
} from "./types";

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => api.get<Contact[]>("/contacts"),
  });
}

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: () => api.get<Pipeline[]>("/pipelines"),
    staleTime: 60_000,
  });
}

export function useBoard(filters: BoardFilters = {}) {
  return useQuery({
    queryKey: ["board", filters],
    queryFn: () =>
      api.get<BoardCard[]>(
        `/opportunities/board${buildQuery(filters as Record<string, unknown>)}`
      ),
  });
}

export function useReactivationQueue(includeFuture = false) {
  return useQuery({
    queryKey: ["reactivation", includeFuture],
    queryFn: () =>
      api.get<BoardCard[]>(
        `/opportunities/reactivation${buildQuery({ include_future: includeFuture })}`
      ),
  });
}

export function useStalled(level?: "warning" | "danger") {
  return useQuery({
    queryKey: ["stalled", level],
    queryFn: () =>
      api.get<BoardCard[]>(`/opportunities/stalled${buildQuery({ level })}`),
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardMetrics>("/dashboard/metrics"),
  });
}

export function useOpportunityDetail(id: number | null) {
  return useQuery({
    queryKey: ["opportunity", id],
    enabled: id !== null,
    queryFn: () => api.get<OpportunityDetail>(`/opportunities/${id}/details`),
  });
}

export function useContactSummary(id: number | null) {
  return useQuery({
    queryKey: ["contact-summary", id],
    enabled: id !== null,
    queryFn: () => api.get<ContactSummary>(`/contacts/${id}/summary`),
  });
}
