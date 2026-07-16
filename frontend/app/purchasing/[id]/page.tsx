"use client";

import { use } from "react";
import Link from "next/link";
import { AddNftToWalletButton } from "@/components/AddNftToWalletButton";
import { ApprovalStatusPanel } from "@/components/ApprovalStatusPanel";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { RoleGuard } from "@/components/RoleGuard";
import { ViewPdfButton } from "@/components/ViewPdfButton";
import { useInvoice } from "@/lib/useInvoices";
import { Invoice, InvoiceStatus, Role } from "@/lib/contract";
import { PURCHASING_NAV } from "@/lib/navigation";
import { primaryButtonClass } from "@/lib/ui";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Purchasing} navItems={PURCHASING_NAV}>
      <InvoiceDetail params={params} />
    </RoleGuard>
  );
}

function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useInvoice(BigInt(id));
  const invoice = data as Invoice | undefined;

  const backLink = (
    <Link href="/purchasing" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Daftar Invoice
    </Link>
  );

  if (isLoading) {
    return (
      <main className="flex w-full max-w-3xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat invoice...</p>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="flex w-full max-w-3xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Invoice tidak ditemukan.</p>
      </main>
    );
  }

  const isRejected =
    invoice.status === InvoiceStatus.RejectedByFinance || invoice.status === InvoiceStatus.RejectedByManager;

  return (
    <main className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      {backLink}

      <InvoiceDocument invoice={invoice} headerRight={<ViewPdfButton invoice={invoice} />} />

      <div>
        <ApprovalStatusPanel invoice={invoice} />
      </div>

      {invoice.status === InvoiceStatus.Approved && (
        <div className="flex justify-end">
          <AddNftToWalletButton tokenId={invoice.id} />
        </div>
      )}

      {isRejected && (
        <div className="flex justify-end">
          <Link href={`/purchasing/${invoice.id}/revise`} className={primaryButtonClass}>
            Revisi &amp; Ajukan Ulang
          </Link>
        </div>
      )}
    </main>
  );
}
