"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CurrencyInput } from "@/components/CurrencyInput";
import { RoleGuard } from "@/components/RoleGuard";
import { useContract } from "@/lib/useContracts";
import { CONTRACT_ABI, CONTRACT_ADDRESS, CompanyContract, ContractStatus, Role } from "@/lib/contract";
import { LEGAL_NAV } from "@/lib/navigation";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type ClauseRow = { content: string };

const MAX_DAYS_BACK = 3;
const MAX_DAYS_FORWARD = 1;

function toDateValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateValueFromUnix(unixSeconds: bigint): string {
  return toDateValue(new Date(Number(unixSeconds) * 1000));
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export default function ReviseContractPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Legal} navItems={LEGAL_NAV}>
      <ReviseContractForm params={params} />
    </RoleGuard>
  );
}

function ReviseContractForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useAccount();
  const { data, isLoading } = useContract(BigInt(id));
  const contract = data as CompanyContract | undefined;

  const [now] = useState(() => new Date());
  const minDate = addDays(now, -MAX_DAYS_BACK);
  const maxDate = addDays(now, MAX_DAYS_FORWARD);

  const [counterpartyName, setCounterpartyName] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateValue(now));
  const [validFrom, setValidFrom] = useState(toDateValue(now));
  const [validUntil, setValidUntil] = useState(toDateValue(now));
  const [clauses, setClauses] = useState<ClauseRow[]>([{ content: "" }]);
  const [keterangan, setKeterangan] = useState("");
  const [contractValue, setContractValue] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!contract || initialized) return;
    setCounterpartyName(contract.counterpartyName);
    setValidFrom(toDateValueFromUnix(contract.validFrom));
    setValidUntil(toDateValueFromUnix(contract.validUntil));
    setClauses(contract.clauses.map((clause) => ({ content: clause.content })));
    setKeterangan(contract.keterangan);
    setContractValue(contract.contractValue.toString());
    setInitialized(true);
  }, [contract, initialized]);

  useEffect(() => {
    if (isSuccess) {
      router.push(`/legal/${id}`);
    }
  }, [isSuccess, id, router]);

  const backLink = (
    <Link href={`/legal/${id}`} className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Detail Kontrak
    </Link>
  );

  if (isLoading || !initialized) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat kontrak...</p>
      </main>
    );
  }

  if (!contract) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Kontrak tidak ditemukan.</p>
      </main>
    );
  }

  const isRejected =
    contract.status === ContractStatus.RejectedByFinance || contract.status === ContractStatus.RejectedByDirektur;

  if (!isRejected) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Kontrak ini tidak berstatus ditolak, tidak bisa direvisi.</p>
      </main>
    );
  }

  if (address?.toLowerCase() !== contract.legal.toLowerCase()) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Hanya wallet pembuat kontrak ini yang bisa merevisinya.</p>
      </main>
    );
  }

  const doc = contract;

  function updateClause(index: number, content: string) {
    setClauses((prev) => prev.map((clause, i) => (i === index ? { content } : clause)));
  }

  function addClause() {
    setClauses((prev) => [...prev, { content: "" }]);
  }

  function removeClause(index: number) {
    setClauses((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!CONTRACT_ADDRESS) {
      setFormError("Alamat smart contract belum diset (NEXT_PUBLIC_CONTRACT_ADDRESS).");
      return;
    }
    const datePart = new Date(selectedDate);
    if (Number.isNaN(datePart.getTime())) {
      setFormError("Tanggal tidak valid.");
      return;
    }
    const contractDateTime = new Date(datePart);
    contractDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

    if (toDateValue(datePart) < toDateValue(minDate) || toDateValue(datePart) > toDateValue(maxDate)) {
      setFormError(
        `Tanggal hanya boleh ${MAX_DAYS_BACK} hari ke belakang sampai ${MAX_DAYS_FORWARD} hari ke depan dari hari ini.`
      );
      return;
    }

    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);
    if (Number.isNaN(validFromDate.getTime()) || Number.isNaN(validUntilDate.getTime())) {
      setFormError("Masa berlaku tidak valid.");
      return;
    }
    if (validUntilDate < validFromDate) {
      setFormError("Tanggal berakhir tidak boleh sebelum tanggal mulai.");
      return;
    }

    if (keterangan.trim().length === 0) {
      setFormError("Keterangan wajib diisi.");
      return;
    }

    const validClauses = clauses.filter((clause) => clause.content.trim().length > 0);
    if (validClauses.length === 0) {
      setFormError("Minimal satu pasal harus diisi.");
      return;
    }

    writeContract({
      abi: CONTRACT_ABI,
      address: CONTRACT_ADDRESS,
      functionName: "reviseContract",
      args: [
        doc.id,
        counterpartyName,
        BigInt(Math.floor(contractDateTime.getTime() / 1000)),
        BigInt(Math.floor(validFromDate.getTime() / 1000)),
        BigInt(Math.floor(validUntilDate.getTime() / 1000)),
        validClauses.map((clause) => ({ content: clause.content.trim() })),
        keterangan.trim(),
        BigInt(contractValue || "0"),
      ],
    });
  }

  return (
    <main className="flex w-full max-w-2xl flex-col gap-5 px-8 py-10">
      {backLink}

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">
            Revisi Kontrak KTR-{contract.id.toString().padStart(4, "0")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Perbaiki data di bawah lalu ajukan ulang. Kontrak akan kembali ke tahap "Menunggu
            Finance" dengan ID yang sama — riwayat penolakan sebelumnya tetap tersimpan sebagai
            audit trail.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Tanggal
              <input
                type="date"
                value={selectedDate}
                min={toDateValue(minDate)}
                max={toDateValue(maxDate)}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={inputClass}
              />
              <span className="text-xs font-normal text-slate-400">
                Bisa dipilih {MAX_DAYS_BACK} hari ke belakang s/d {MAX_DAYS_FORWARD} hari ke depan.
              </span>
            </label>

            <label className={labelClass}>
              Waktu
              <input
                value={now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                disabled
                className={`${inputClass} bg-slate-50 text-slate-400`}
              />
              <span className="text-xs font-normal text-slate-400">Otomatis, tidak bisa diubah.</span>
            </label>
          </div>

          <label className={labelClass}>
            Pihak Kedua
            <input value={counterpartyName} disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
            <span className="text-xs font-normal text-slate-400">
              Tidak bisa diubah saat revisi. Kalau pihak keduanya memang salah, buat kontrak baru.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Masa Berlaku Mulai
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Masa Berlaku Berakhir
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Pasal Kerja Sama</span>
            <p className="text-xs text-slate-400">Bisa diedit, ditambah, atau dikurangi saat revisi.</p>
            <div className="flex flex-col gap-3">
              {clauses.map((clause, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">PASAL {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeClause(index)}
                      disabled={clauses.length === 1}
                      className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Hapus Pasal
                    </button>
                  </div>
                  <textarea
                    value={clause.content}
                    onChange={(e) => updateClause(index, e.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={addClause} className={`${secondaryButtonClass} self-start`}>
              + Tambah Pasal
            </button>
          </div>

          <label className={labelClass}>
            Keterangan
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Nilai Kontrak
            <CurrencyInput
              value={contractValue}
              onChange={setContractValue}
              placeholder="Rp 0"
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
                : "Ajukan Ulang"}
          </button>
        </form>
      </div>
    </main>
  );
}
