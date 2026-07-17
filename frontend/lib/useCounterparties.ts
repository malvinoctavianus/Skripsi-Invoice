"use client";

import { useReadContract } from "wagmi";
import { COUNTERPARTY_REGISTRY_ABI, COUNTERPARTY_REGISTRY_ADDRESS, Counterparty, CounterpartyEdit } from "./contract";

export function useAllCounterparties() {
  const { data, isLoading, refetch } = useReadContract({
    abi: COUNTERPARTY_REGISTRY_ABI,
    address: COUNTERPARTY_REGISTRY_ADDRESS,
    functionName: "getAllCounterparties",
    query: { enabled: Boolean(COUNTERPARTY_REGISTRY_ADDRESS) },
  });

  const counterparties = (data as readonly Counterparty[] | undefined) ?? [];

  return { counterparties, isLoading, refetch };
}

/** Only counterparties Admin has approved - safe to offer in contract counterparty pickers. */
export function useApprovedCounterparties() {
  const { data, isLoading, refetch } = useReadContract({
    abi: COUNTERPARTY_REGISTRY_ABI,
    address: COUNTERPARTY_REGISTRY_ADDRESS,
    functionName: "getApprovedCounterparties",
    query: { enabled: Boolean(COUNTERPARTY_REGISTRY_ADDRESS) },
  });

  const counterparties = (data as readonly Counterparty[] | undefined) ?? [];

  return { counterparties, isLoading, refetch };
}

export function useCounterparty(id: bigint) {
  const { data, isLoading, refetch } = useReadContract({
    abi: COUNTERPARTY_REGISTRY_ABI,
    address: COUNTERPARTY_REGISTRY_ADDRESS,
    functionName: "getCounterparty",
    args: [id],
    query: { enabled: Boolean(COUNTERPARTY_REGISTRY_ADDRESS) },
  });

  return { counterparty: data as Counterparty | undefined, isLoading, refetch };
}

export function useCounterpartyEditHistory(id: bigint) {
  const { data, isLoading, refetch } = useReadContract({
    abi: COUNTERPARTY_REGISTRY_ABI,
    address: COUNTERPARTY_REGISTRY_ADDRESS,
    functionName: "getCounterpartyEditHistory",
    args: [id],
    query: { enabled: Boolean(COUNTERPARTY_REGISTRY_ADDRESS) },
  });

  const history = (data as readonly CounterpartyEdit[] | undefined) ?? [];

  return { history, isLoading, refetch };
}
