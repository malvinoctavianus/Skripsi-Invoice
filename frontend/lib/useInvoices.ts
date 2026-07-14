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
