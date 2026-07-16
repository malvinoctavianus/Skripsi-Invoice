"use client";

import { useReadContract } from "wagmi";
import { SUPPLIER_REGISTRY_ABI, SUPPLIER_REGISTRY_ADDRESS, Supplier, SupplierEdit } from "./contract";

export function useAllSuppliers() {
  const { data, isLoading, refetch } = useReadContract({
    abi: SUPPLIER_REGISTRY_ABI,
    address: SUPPLIER_REGISTRY_ADDRESS,
    functionName: "getAllSuppliers",
    query: { enabled: Boolean(SUPPLIER_REGISTRY_ADDRESS) },
  });

  const suppliers = (data as readonly Supplier[] | undefined) ?? [];

  return { suppliers, isLoading, refetch };
}

/** Only suppliers Admin has approved — safe to offer in invoice supplier pickers. */
export function useApprovedSuppliers() {
  const { data, isLoading, refetch } = useReadContract({
    abi: SUPPLIER_REGISTRY_ABI,
    address: SUPPLIER_REGISTRY_ADDRESS,
    functionName: "getApprovedSuppliers",
    query: { enabled: Boolean(SUPPLIER_REGISTRY_ADDRESS) },
  });

  const suppliers = (data as readonly Supplier[] | undefined) ?? [];

  return { suppliers, isLoading, refetch };
}

export function useSupplier(id: bigint) {
  const { data, isLoading, refetch } = useReadContract({
    abi: SUPPLIER_REGISTRY_ABI,
    address: SUPPLIER_REGISTRY_ADDRESS,
    functionName: "getSupplier",
    args: [id],
    query: { enabled: Boolean(SUPPLIER_REGISTRY_ADDRESS) },
  });

  return { supplier: data as Supplier | undefined, isLoading, refetch };
}

export function useSupplierEditHistory(id: bigint) {
  const { data, isLoading, refetch } = useReadContract({
    abi: SUPPLIER_REGISTRY_ABI,
    address: SUPPLIER_REGISTRY_ADDRESS,
    functionName: "getSupplierEditHistory",
    args: [id],
    query: { enabled: Boolean(SUPPLIER_REGISTRY_ADDRESS) },
  });

  const history = (data as readonly SupplierEdit[] | undefined) ?? [];

  return { history, isLoading, refetch };
}
