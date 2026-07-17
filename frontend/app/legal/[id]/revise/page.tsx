"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CurrencyInput } from "@/components/CurrencyInput";
import { RoleGuard } from "@/components/RoleGuard";
import { useContract } from "@/lib/useContracts";
import { CONTRACT_ABI, CONTRACT_ADDRESS, CompanyContract, ContractStatus, PaymentMethod, paymentMethodLabel, Role } from "@/lib/contract";
import { LEGAL_NAV } from "@/lib/navigation";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

type ClauseRow = { name: string; value: string };

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
  const [clauses, setClauses] = useState<ClauseRow[]>([{ name: "", value: "0" }]);
  const [keterangan, setKeterangan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!contract || initialized) return;
    setCounterpartyName(contract.counterpartyName);
    setValidFrom(toDateValueFromUnix(contract.validFrom));
    setValidUntil(toDateValueFromUnix(contract.validUntil));
    setClauses(
      contract.clauses.map((clause) => ({
        name: clause.name,
        value: clause.value.toString(),
      }))
    );
    setKeterangan(contract.keterangan);
    setPaymentMethod(contract.paymentMethod);
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

  const total = clauses.reduce((sum, clause) => sum + (Number(clause.value) || 0), 0);

  function updateClauseValue(index: number, value: string) {
    setClauses((prev) => prev.map((clause, i) => (i === index ? { ...clause, value } : clause)));
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
    if (paymentMethod === null) {
      setFormError("Metode pembayaran wajib dipilih.");
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
        clauses.map((clause) => ({
          name: clause.name,
          value: BigInt(clause.value || "0"),
        })),
        keterangan.trim(),
        paymentMethod,
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
            <span className="text-sm font-medium text-slate-700">Pasal / Klausul Kontrak</span>
            <p className="text-xs text-slate-400">
              Nama pasal tidak bisa diubah saat revisi, hanya nilainya.
            </p>
            <div className="flex flex-col gap-3">
              {clauses.map((clause, index) => (
                <div key={index} className="grid grid-cols-[1fr_160px] items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Nama Pasal
                    <input value={clause.name} disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Nilai
                    <CurrencyInput
                      value={clause.value}
                      onChange={(raw) => updateClauseValue(index, raw)}
                      placeholder="Rp 0"
                      className={inputClass}
                    />
                  </label>
                </div>
              ))}
            </div>
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

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Metode Pembayaran</span>
            <div className="flex gap-2">
              {[PaymentMethod.Cash, PaymentMethod.Transfer].map((method) => (
                <label
                  key={method}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    paymentMethod === method
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="sr-only"
                  />
                  {paymentMethodLabel(method)}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Total Nilai Kontrak</span>
              <span className="font-semibold text-slate-900">{formatRupiah(total)}</span>
            </div>
          </div>

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
