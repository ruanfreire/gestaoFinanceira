import { useMutation, useQuery } from "@tanstack/react-query";
import { billingApi } from "./api";

export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => billingApi.getStatus(),
    staleTime: 60_000,
  });
}

export function useBillingPlans() {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => billingApi.listPlans(),
    staleTime: 300_000,
  });
}

export function useBillingCheckout() {
  return useMutation({
    mutationFn: (plan: "starter" | "pro") => billingApi.createCheckout(plan),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () => billingApi.createPortal(),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}
