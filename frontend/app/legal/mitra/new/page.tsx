"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RoleGuard } from "@/components/RoleGuard";
import { Role, COUNTERPARTY_REGISTRY_ABI, COUNTERPARTY_REGISTRY_ADDRESS } from "@/lib/contract";
import { LEGAL_NAV } from "@/lib/navigation";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

function toDateValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function NewMitraPage() {
  return (
    <RoleGuard role={Role.Legal} navItems={LEGAL_NAV}>
      <NewMitraForm />
    </RoleGuard>
  );
}

function NewMitraForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState(toDateValue(new Date()));
  const [alamat, setAlamat] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      router.push("/legal/mitra");
    }
  }, [isSuccess, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!COUNTERPARTY_REGISTRY_ADDRESS) {
      setFormError("Alamat smart contract mitra belum diset (NEXT_PUBLIC_COUNTERPARTY_REGISTRY_ADDRESS).");
      return;
    }
    if (name.trim().length === 0) {
      setFormError("Nama perusahaan wajib diisi.");
      return;
    }
    if (signatoryName.trim().length === 0) {
      setFormError("Nama penandatangan wajib diisi.");
      return;
    }
    if (birthPlace.trim().length === 0) {
      setFormError("Tempat lahir wajib diisi.");
      return;
    }
    const birthDateObj = new Date(birthDate);
    if (Number.isNaN(birthDateObj.getTime())) {
      setFormError("Tanggal lahir tidak valid.");
      return;
    }
    if (alamat.trim().length === 0) {
      setFormError("Alamat sesuai KTP wajib diisi.");
      return;
    }
    if (idNumber.trim().length === 0) {
      setFormError("No. KTP/SIM wajib diisi.");
      return;
    }

    writeContract({
      abi: COUNTERPARTY_REGISTRY_ABI,
      address: COUNTERPARTY_REGISTRY_ADDRESS,
      functionName: "addCounterparty",
      args: [
        name.trim(),
        signatoryName.trim(),
        birthPlace.trim(),
        BigInt(Math.floor(birthDateObj.getTime() / 1000)),
        alamat.trim(),
        idNumber.trim(),
      ],
    });
  }

  return (
    <main className="flex w-full max-w-lg flex-col gap-5 px-8 py-10">
      <Link href="/legal/mitra" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Data Mitra
      </Link>

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Tambah Mitra</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mitra ini akan tersimpan permanen di blockchain. Sebelum bisa dipilih saat membuat
            kontrak, data ini perlu disetujui dulu oleh Admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={labelClass}>
            Nama Perusahaan
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. PT Mitra Sejahtera"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Nama Penandatangan
            <input
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="mis. Taufik Kusnanto"
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Tempat Lahir (sesuai KTP)
              <input
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="mis. Kulon Progo"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Tanggal Lahir (sesuai KTP)
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className={labelClass}>
            Alamat Sesuai KTP
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={3}
              placeholder="mis. Jl. Wates Km. 12 Sentolo Kulon Progo"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            No. KTP/SIM
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="mis. 757757868686868"
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
                : "Simpan Mitra"}
          </button>
        </form>
      </div>
    </main>
  );
}
