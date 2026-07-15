"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { INVOICE_ABI, INVOICE_ADDRESS, Invoice, InvoiceStatus } from "./contract";

export function useInvoice(id: bigint | number | undefined) {
  return useReadContract({
    abi: INVOICE_ABI,
    address: INVOICE_ADDRESS,
    functionName: "getInvoice",
    args: id !== undefined ? [BigInt(id)] : undefined,
    query: { enabled: Boolean(INVOICE_ADDRESS && id !== undefined) },
  });
}

export function usePurchasingInvoices() {
  const { address } = useAccount();

  const { data: ids, isLoading: idsLoading, refetch: refetchIds } = useReadContract({
    abi: INVOICE_ABI,
    address: INVOICE_ADDRESS,
    functionName: "getInvoicesByPurchasing",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(INVOICE_ADDRESS && address) },
  });

  const invoiceIds = (ids as readonly bigint[] | undefined) ?? [];

  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useReadContracts({
    contracts: invoiceIds.map((id) => ({
      abi: INVOICE_ABI,
      address: INVOICE_ADDRESS,
      functionName: "getInvoice",
      args: [id],
    })),
    query: { enabled: Boolean(INVOICE_ADDRESS) && invoiceIds.length > 0 },
  });

  const invoices = (invoicesData ?? [])
    .map((entry) => entry.result as Invoice | undefined)
    .filter((invoice): invoice is Invoice => Boolean(invoice));

  const pending = invoices.filter(
    (inv) => inv.status === InvoiceStatus.PendingFinance || inv.status === InvoiceStatus.PendingManager
  );
  const approved = invoices.filter((inv) => inv.status === InvoiceStatus.Approved);
  const rejected = invoices.filter(
    (inv) => inv.status === InvoiceStatus.RejectedByFinance || inv.status === InvoiceStatus.RejectedByManager
  );

  function refetch() {
    refetchIds();
    refetchInvoices();
  }

  return {
    invoices,
    pending,
    approved,
    rejected,
    isLoading: idsLoading || invoicesLoading,
    refetch,
  };
}

/** All invoices across every Purchasing wallet, newest first - for Finance/Manager queues. */
export function useAllInvoices() {
  const { data: nextIdData, isLoading: nextIdLoading, refetch: refetchNextId } = useReadContract({
    abi: INVOICE_ABI,
    address: INVOICE_ADDRESS,
    functionName: "nextInvoiceId",
    query: { enabled: Boolean(INVOICE_ADDRESS) },
  });

  const nextId = (nextIdData as bigint | undefined) ?? BigInt(1);
  const ids = Array.from({ length: Math.max(Number(nextId) - 1, 0) }, (_, i) => BigInt(i + 1));

  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useReadContracts({
    contracts: ids.map((id) => ({
      abi: INVOICE_ABI,
      address: INVOICE_ADDRESS,
      functionName: "getInvoice",
      args: [id],
    })),
    query: { enabled: Boolean(INVOICE_ADDRESS) && ids.length > 0 },
  });

  const invoices = (invoicesData ?? [])
    .map((entry) => entry.result as Invoice | undefined)
    .filter((invoice): invoice is Invoice => Boolean(invoice))
    .sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));

  function refetch() {
    refetchNextId();
    refetchInvoices();
  }

  return {
    invoices,
    isLoading: nextIdLoading || invoicesLoading,
    refetch,
  };
}
