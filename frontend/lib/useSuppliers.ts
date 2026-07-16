"use client";

import { useReadContract } from "wagmi";
import { SUPPLIER_REGISTRY_ABI, SUPPLIER_REGISTRY_ADDRESS, Supplier } from "./contract";

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
