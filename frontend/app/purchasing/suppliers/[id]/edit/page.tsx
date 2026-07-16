"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RoleGuard } from "@/components/RoleGuard";
import { useSupplier, useSupplierEditHistory } from "@/lib/useSuppliers";
import { Role, SUPPLIER_REGISTRY_ABI, SUPPLIER_REGISTRY_ADDRESS } from "@/lib/contract";
import { PURCHASING_NAV } from "@/lib/navigation";
import { formatDateTime } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Purchasing} navItems={PURCHASING_NAV}>
      <EditSupplierForm params={params} />
    </RoleGuard>
  );
}

function EditSupplierForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supplierId = BigInt(id);
  const router = useRouter();
  const { address } = useAccount();
  const { supplier, isLoading } = useSupplier(supplierId);
  const { history } = useSupplierEditHistory(supplierId);

  const [name, setName] = useState("");
  const [alamat, setAlamat] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!supplier || initialized) return;
    setName(supplier.name);
    setAlamat(supplier.alamat);
    setInitialized(true);
  }, [supplier, initialized]);

  useEffect(() => {
    if (isSuccess) {
      router.push("/purchasing/suppliers");
    }
  }, [isSuccess, router]);

  const backLink = (
    <Link href="/purchasing/suppliers" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Data Supplier
    </Link>
  );

  if (isLoading || !initialized) {
    return (
      <main className="flex w-full max-w-lg flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat data supplier...</p>
      </main>
    );
  }

  if (!supplier) {
    return (
      <main className="flex w-full max-w-lg flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Supplier tidak ditemukan.</p>
      </main>
    );
  }

  if (address?.toLowerCase() !== supplier.addedBy.toLowerCase()) {
    return (
      <main className="flex w-full max-w-lg flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Hanya wallet yang menambahkan supplier ini yang bisa mengeditnya.</p>
      </main>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!SUPPLIER_REGISTRY_ADDRESS) {
      setFormError("Alamat smart contract supplier belum diset (NEXT_PUBLIC_SUPPLIER_REGISTRY_ADDRESS).");
      return;
    }
    if (name.trim().length === 0) {
      setFormError("Nama supplier wajib diisi.");
      return;
    }
    if (alamat.trim().length === 0) {
      setFormError("Alamat supplier wajib diisi.");
      return;
    }

    writeContract({
      abi: SUPPLIER_REGISTRY_ABI,
      address: SUPPLIER_REGISTRY_ADDRESS,
      functionName: "editSupplier",
      args: [supplierId, name.trim(), alamat.trim()],
    });
  }

  return (
    <main className="flex w-full max-w-lg flex-col gap-5 px-8 py-10">
      {backLink}

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Edit Supplier</h1>
          <p className="mt-1 text-sm text-slate-500">
            Perubahan tersimpan permanen di blockchain. Data lama tidak hilang — tetap tercatat
            sebagai riwayat di bawah. Setelah diedit, supplier ini perlu disetujui ulang oleh
            Admin sebelum bisa dipilih lagi saat membuat invoice.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={labelClass}>
            Nama Supplier
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>

          <label className={labelClass}>
            Alamat
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </label>

          {formError && <p className={errorAlertClass}>{formError}</p>}
          {writeError && <p className={errorAlertClass}>{writeError.message.split("\n")[0]}</p>}

          <button type="submit" disabled={isPending || isConfirming} className={primaryButtonClass}>
            {isPending
              ? "Menunggu konfirmasi MetaMask..."
              : isConfirming
                ? "Mengirim ke blockchain..."
                : "Simpan Perubahan"}
          </button>
        </form>
      </div>

      {history.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Riwayat Perubahan</h2>
          <div className="flex flex-col gap-3">
            {history.map((entry, i) => (
              <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-700">{entry.name}</p>
                <p className="text-slate-500">{entry.alamat}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Diubah {formatDateTime(entry.editedAt)} oleh {entry.editedBy}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
