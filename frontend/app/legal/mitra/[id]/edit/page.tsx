"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RoleGuard } from "@/components/RoleGuard";
import { useCounterparty, useCounterpartyEditHistory } from "@/lib/useCounterparties";
import { Role, COUNTERPARTY_REGISTRY_ABI, COUNTERPARTY_REGISTRY_ADDRESS, CounterpartyStatus } from "@/lib/contract";
import { LEGAL_NAV } from "@/lib/navigation";
import { formatDateTime } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

export default function EditMitraPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Legal} navItems={LEGAL_NAV}>
      <EditMitraForm params={params} />
    </RoleGuard>
  );
}

function EditMitraForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const counterpartyId = BigInt(id);
  const router = useRouter();
  const { address } = useAccount();
  const { counterparty, isLoading } = useCounterparty(counterpartyId);
  const { history } = useCounterpartyEditHistory(counterpartyId);

  const [name, setName] = useState("");
  const [alamat, setAlamat] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!counterparty || initialized) return;
    setName(counterparty.name);
    setAlamat(counterparty.alamat);
    setInitialized(true);
  }, [counterparty, initialized]);

  useEffect(() => {
    if (isSuccess) {
      router.push("/legal/mitra");
    }
  }, [isSuccess, router]);

  const backLink = (
    <Link href="/legal/mitra" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Data Mitra
    </Link>
  );

  if (isLoading || !initialized) {
    return (
      <main className="flex w-full max-w-lg flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat data mitra...</p>
      </main>
    );
  }

  if (!counterparty) {
    return (
      <main className="flex w-full max-w-lg flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Mitra tidak ditemukan.</p>
      </main>
    );
  }

  if (address?.toLowerCase() !== counterparty.addedBy.toLowerCase()) {
    return (
      <main className="flex w-full max-w-lg flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Hanya wallet yang menambahkan mitra ini yang bisa mengeditnya.</p>
      </main>
    );
  }

  if (counterparty.status === CounterpartyStatus.Approved) {
    return (
      <main className="flex w-full max-w-lg flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">
          Mitra ini sudah Approved dan tidak bisa diedit lagi.
        </p>
      </main>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!COUNTERPARTY_REGISTRY_ADDRESS) {
      setFormError("Alamat smart contract mitra belum diset (NEXT_PUBLIC_COUNTERPARTY_REGISTRY_ADDRESS).");
      return;
    }
    if (name.trim().length === 0) {
      setFormError("Nama mitra wajib diisi.");
      return;
    }
    if (alamat.trim().length === 0) {
      setFormError("Alamat mitra wajib diisi.");
      return;
    }

    writeContract({
      abi: COUNTERPARTY_REGISTRY_ABI,
      address: COUNTERPARTY_REGISTRY_ADDRESS,
      functionName: "editCounterparty",
      args: [counterpartyId, name.trim(), alamat.trim()],
    });
  }

  return (
    <main className="flex w-full max-w-lg flex-col gap-5 px-8 py-10">
      {backLink}

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">
            {counterparty.status === CounterpartyStatus.Rejected ? "Ajukan Ulang Mitra" : "Edit Mitra"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Perubahan tersimpan permanen di blockchain. Data lama tidak hilang — tetap tercatat
            sebagai riwayat di bawah. Setelah disimpan, mitra ini kembali berstatus Menunggu
            Persetujuan dan perlu direview ulang oleh Admin sebelum bisa dipilih saat membuat
            kontrak.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={labelClass}>
            Nama Mitra
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
