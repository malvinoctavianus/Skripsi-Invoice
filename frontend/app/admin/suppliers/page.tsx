"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RoleGuard } from "@/components/RoleGuard";
import { useAllSuppliers } from "@/lib/useSuppliers";
import {
  Role,
  Supplier,
  SUPPLIER_REGISTRY_ABI,
  SUPPLIER_REGISTRY_ADDRESS,
  SupplierStatus,
  supplierStatusLabel,
} from "@/lib/contract";
import { ADMIN_NAV } from "@/lib/navigation";
import { formatDateTime } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, primaryButtonClass, secondaryButtonClass, statusBadgeClass } from "@/lib/ui";

export default function AdminSuppliersPage() {
  return (
    <RoleGuard role={Role.Admin} navItems={ADMIN_NAV}>
      <AdminSuppliers />
    </RoleGuard>
  );
}

function AdminSuppliers() {
  const { suppliers, isLoading, refetch } = useAllSuppliers();

  const pending = suppliers.filter((s) => s.status === SupplierStatus.Pending);
  const reviewed = suppliers.filter((s) => s.status !== SupplierStatus.Pending);

  return (
    <main className="flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <Link href="/admin" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Dashboard Admin
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Persetujuan Supplier</h1>
        <p className="mt-1 text-sm text-slate-500">
          Supplier baru atau yang baru diedit harus disetujui di sini sebelum bisa dipilih
          Purchasing saat membuat invoice.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Memuat data supplier...</p>}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Menunggu Persetujuan ({pending.length})
        </h2>

        {!isLoading && pending.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center gap-2 py-10 text-center`}>
            <p className="font-medium text-slate-700">Tidak ada supplier menunggu review</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {pending.map((supplier) => (
            <SupplierReviewCard key={supplier.id.toString()} supplier={supplier} onDone={refetch} />
          ))}
        </div>
      </div>

      {!isLoading && reviewed.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Sudah Direview ({reviewed.length})
          </h2>
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Nama Supplier</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Direview</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((supplier) => {
                  const label = supplierStatusLabel(supplier.status);
                  return (
                    <tr key={supplier.id.toString()} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-700">{supplier.name}</td>
                      <td className="px-4 py-3 text-slate-600">{supplier.alamat}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                            statusBadgeClass[label] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(supplier.reviewedAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{supplier.reviewNote || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function SupplierReviewCard({ supplier, onDone }: { supplier: Supplier; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      reset();
      onDone();
    }
  }, [isSuccess, reset, onDone]);

  function submit(approve: boolean) {
    setFormError(null);
    if (!SUPPLIER_REGISTRY_ADDRESS) {
      setFormError("Alamat smart contract supplier belum diset.");
      return;
    }
    if (!approve && note.trim().length === 0) {
      setFormError("Alasan penolakan wajib diisi.");
      return;
    }
    writeContract({
      abi: SUPPLIER_REGISTRY_ABI,
      address: SUPPLIER_REGISTRY_ADDRESS,
      functionName: "reviewSupplier",
      args: [supplier.id, approve, note.trim()],
    });
  }

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-800">{supplier.name}</p>
          <p className="text-sm text-slate-500">{supplier.alamat}</p>
          <p className="mt-1 text-xs text-slate-400">
            Diajukan {formatDateTime(supplier.addedAt)} oleh {supplier.addedBy}
            {supplier.lastEditedAt > BigInt(0) && ` · diedit ${formatDateTime(supplier.lastEditedAt)}`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Catatan (wajib diisi kalau menolak)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="mis. Alamat tidak lengkap"
            className={inputClass}
          />
        </label>

        {formError && <p className={errorAlertClass}>{formError}</p>}
        {writeError && <p className={errorAlertClass}>{writeError.message.split("\n")[0]}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => submit(true)}
            disabled={isPending || isConfirming}
            className={primaryButtonClass}
          >
            {isPending || isConfirming ? "Memproses..." : "Approve"}
          </button>
          <button
            onClick={() => submit(false)}
            disabled={isPending || isConfirming}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
