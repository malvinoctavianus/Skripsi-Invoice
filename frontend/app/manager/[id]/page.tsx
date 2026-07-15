"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ApprovalStatusPanel } from "@/components/ApprovalStatusPanel";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { RoleGuard } from "@/components/RoleGuard";
import { useInvoice } from "@/lib/useInvoices";
import { Invoice, Role } from "@/lib/contract";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { secondaryButtonClass } from "@/lib/ui";

export default function ManagerInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Manager}>
      <ManagerInvoiceDetail params={params} />
    </RoleGuard>
  );
}

function ManagerInvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useInvoice(BigInt(id));
  const invoice = data as Invoice | undefined;
  const [downloading, setDownloading] = useState(false);

  const backLink = (
    <Link href="/manager" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Daftar Invoice
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

      <InvoiceDocument
        invoice={invoice}
        headerRight={
          <button
            onClick={async () => {
              setDownloading(true);
              try {
                await downloadInvoicePdf(invoice);
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className={secondaryButtonClass}
          >
            {downloading ? "Membuat PDF..." : "Download PDF"}
          </button>
        }
      />

      <div className="flex justify-end">
        <div className="w-full sm:max-w-md">
          <ApprovalStatusPanel invoice={invoice} />
        </div>
      </div>
    </main>
  );
}
