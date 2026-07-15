"use client";

import { use } from "react";
import Link from "next/link";
import { ApprovalStatusPanel } from "@/components/ApprovalStatusPanel";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { RoleGuard } from "@/components/RoleGuard";
import { ViewPdfButton } from "@/components/ViewPdfButton";
import { useInvoice } from "@/lib/useInvoices";
import { Invoice, Role } from "@/lib/contract";

export default function AdminHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Admin}>
      <HistoryDetail params={params} />
    </RoleGuard>
  );
}

function HistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useInvoice(BigInt(id));
  const invoice = data as Invoice | undefined;

  const backLink = (
    <Link href="/admin/history" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke History Transaksi
    </Link>
  );

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat invoice...</p>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        {backLink}
        <p className="text-sm text-red-600">Invoice tidak ditemukan.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      {backLink}

      <p className="-mt-2 font-mono text-xs text-slate-400">
        Dibuat oleh (Purchasing): {invoice.purchasing}
      </p>

      <InvoiceDocument invoice={invoice} headerRight={<ViewPdfButton invoice={invoice} />} />

      <div className="flex justify-end">
        <div className="w-full sm:max-w-md">
          <ApprovalStatusPanel invoice={invoice} />
        </div>
      </div>
    </main>
  );
}
