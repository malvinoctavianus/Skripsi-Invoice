"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RoleGuard } from "@/components/RoleGuard";
import { Role, SUPPLIER_REGISTRY_ABI, SUPPLIER_REGISTRY_ADDRESS } from "@/lib/contract";
import { PURCHASING_NAV } from "@/lib/navigation";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

export default function NewSupplierPage() {
  return (
    <RoleGuard role={Role.Purchasing} navItems={PURCHASING_NAV}>
      <NewSupplierForm />
    </RoleGuard>
  );
}

function NewSupplierForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [alamat, setAlamat] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      router.push("/purchasing/suppliers");
    }
  }, [isSuccess, router]);

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
      functionName: "addSupplier",
      args: [name.trim(), alamat.trim()],
    });
  }

  return (
    <main className="flex w-full max-w-lg flex-col gap-5 px-8 py-10">
      <Link href="/purchasing/suppliers" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Data Supplier
      </Link>

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Tambah Supplier</h1>
          <p className="mt-1 text-sm text-slate-500">
            Supplier ini akan tersimpan permanen di blockchain. Sebelum bisa dipilih saat membuat
            invoice, data ini perlu disetujui dulu oleh Admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={labelClass}>
            Nama Supplier
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. PT Sumber Makmur"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Alamat
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={3}
              placeholder="mis. Jl. Industri Raya No. 10, Jakarta Utara"
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
                : "Simpan Supplier"}
          </button>
        </form>
      </div>
    </main>
  );
}
