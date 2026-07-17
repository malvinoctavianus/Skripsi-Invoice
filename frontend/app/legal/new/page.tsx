"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { decodeEventLog } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CurrencyInput } from "@/components/CurrencyInput";
import { RoleGuard } from "@/components/RoleGuard";
import { CONTRACT_ABI, CONTRACT_ADDRESS, PaymentMethod, paymentMethodLabel, Role } from "@/lib/contract";
import { LEGAL_NAV } from "@/lib/navigation";
import { useApprovedCounterparties } from "@/lib/useCounterparties";
import { formatRupiah } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type ClauseRow = { name: string; value: string };

type Draft = {
  counterpartyName: string;
  selectedDate: string;
  validFrom: string;
  validUntil: string;
  clauses: ClauseRow[];
  keterangan: string;
  paymentMethod: PaymentMethod | null;
};

const DRAFT_KEY = "legal-contract-draft";

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

const MAX_DAYS_BACK = 3;
const MAX_DAYS_FORWARD = 1;

function toDateValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export default function NewContractPage() {
  return (
    <RoleGuard role={Role.Legal} navItems={LEGAL_NAV}>
      <NewContractForm />
    </RoleGuard>
  );
}

function NewContractForm() {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const minDate = addDays(now, -MAX_DAYS_BACK);
  const maxDate = addDays(now, MAX_DAYS_FORWARD);

  const { counterparties } = useApprovedCounterparties();
  const [draft] = useState(() => loadDraft());
  const [counterpartyName, setCounterpartyName] = useState(draft?.counterpartyName ?? "");
  const [selectedDate, setSelectedDate] = useState(() => {
    const initial = draft?.selectedDate ?? toDateValue(now);
    const min = toDateValue(minDate);
    const max = toDateValue(maxDate);
    if (initial < min) return min;
    if (initial > max) return max;
    return initial;
  });
  const [validFrom, setValidFrom] = useState(draft?.validFrom ?? toDateValue(now));
  const [validUntil, setValidUntil] = useState(draft?.validUntil ?? toDateValue(addDays(now, 365)));
  const [clauses, setClauses] = useState<ClauseRow[]>(
    draft?.clauses ?? [{ name: "", value: "0" }]
  );
  const [keterangan, setKeterangan] = useState(draft?.keterangan ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(draft?.paymentMethod ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    const data: Draft = { counterpartyName, selectedDate, validFrom, validUntil, clauses, keterangan, paymentMethod };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [counterpartyName, selectedDate, validFrom, validUntil, clauses, keterangan, paymentMethod]);

  useEffect(() => {
    if (!isSuccess || !receipt) return;

    window.localStorage.removeItem(DRAFT_KEY);

    let newContractId: bigint | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: CONTRACT_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === "ContractCreated") {
          newContractId = (decoded.args as unknown as { id: bigint }).id;
          break;
        }
      } catch {
        // not our event, ignore
      }
    }

    router.push(newContractId ? `/legal/${newContractId}` : "/legal");
  }, [isSuccess, receipt, router]);

  const total = clauses.reduce((sum, clause) => sum + (Number(clause.value) || 0), 0);

  function updateClause(index: number, patch: Partial<ClauseRow>) {
    setClauses((prev) => prev.map((clause, i) => (i === index ? { ...clause, ...patch } : clause)));
  }

  function addClause() {
    setClauses((prev) => [...prev, { name: "", value: "0" }]);
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
    if (counterpartyName.trim().length === 0) {
      setFormError("Pihak kedua wajib diisi.");
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

    const datePart = new Date(selectedDate);
    if (Number.isNaN(datePart.getTime())) {
      setFormError("Tanggal tidak valid.");
      return;
    }
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
    // Real submit time (jam:menit:detik) tetap ikut tercatat di contractDate, walau tidak
    // ditampilkan sebagai field terpisah di form ini.
    const contractDateTime = new Date(datePart);
    contractDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

    const validClauses = clauses.filter((clause) => clause.name.trim().length > 0);
    if (validClauses.length === 0) {
      setFormError("Minimal satu pasal/klausul harus diisi.");
      return;
    }

    writeContract({
      abi: CONTRACT_ABI,
      address: CONTRACT_ADDRESS,
      functionName: "createContract",
      args: [
        counterpartyName.trim(),
        BigInt(Math.floor(contractDateTime.getTime() / 1000)),
        BigInt(Math.floor(validFromDate.getTime() / 1000)),
        BigInt(Math.floor(validUntilDate.getTime() / 1000)),
        validClauses.map((clause) => ({
          name: clause.name.trim(),
          value: BigInt(clause.value || "0"),
        })),
        keterangan.trim(),
        paymentMethod,
      ],
    });
  }

  return (
    <main className="flex w-full max-w-2xl flex-col gap-5 px-8 py-10">
      <Link href="/legal" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Daftar Kontrak
      </Link>

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Tambah Kontrak</h1>
          <p className="mt-1 text-sm text-slate-500">
            ID Kontrak akan dibuat otomatis oleh smart contract. Setelah submit, kontrak akan
            menunggu digital signature (approval) dari Finance lalu Direktur.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className={labelClass}>
            ID Kontrak
            <input value="Akan dibuat otomatis" disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
          </label>

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
            Pihak Kedua
            {counterparties.length === 0 ? (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">Belum ada data mitra</p>
                <p className="text-xs text-amber-700">
                  Kontrak tidak bisa dibuat sebelum ada mitra yang disetujui Admin. Tambahkan
                  mitra dulu, lalu tunggu Admin menyetujuinya.
                </p>
                <Link
                  href="/legal/mitra/new"
                  className="self-start text-sm font-semibold text-amber-800 underline hover:text-amber-900"
                >
                  + Tambah Mitra
                </Link>
              </div>
            ) : (
              <select
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih mitra...</option>
                {counterparties.map((counterparty) => (
                  <option key={counterparty.id.toString()} value={counterparty.name}>
                    {counterparty.name}
                  </option>
                ))}
              </select>
            )}
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
            <div className="flex flex-col gap-3">
              {clauses.map((clause, index) => (
                <div key={index} className="grid grid-cols-[1fr_160px_auto] items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Nama Pasal
                    <input
                      value={clause.name}
                      onChange={(e) => updateClause(index, { name: e.target.value })}
                      placeholder="mis. Ruang Lingkup Pekerjaan"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Nilai
                    <CurrencyInput
                      value={clause.value}
                      onChange={(raw) => updateClause(index, { value: raw })}
                      placeholder="Rp 0"
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeClause(index)}
                    disabled={clauses.length === 1}
                    className={`${secondaryButtonClass} h-fit disabled:opacity-30`}
                  >
                    Hapus
                  </button>
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
              placeholder="mis. Kerja sama pengadaan jasa untuk periode 1 tahun"
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

          <button
            type="submit"
            disabled={
              isPending || isConfirming || counterpartyName.trim().length === 0 || paymentMethod === null
            }
            className={primaryButtonClass}
          >
            {isPending
              ? "Menunggu konfirmasi MetaMask..."
              : isConfirming
                ? "Mengirim ke blockchain..."
                : "Submit Kontrak"}
          </button>
          {counterpartyName.trim().length === 0 && (
            <p className="text-xs text-slate-400">Pilih pihak kedua dulu sebelum bisa submit.</p>
          )}
          {counterpartyName.trim().length > 0 && paymentMethod === null && (
            <p className="text-xs text-slate-400">Pilih metode pembayaran dulu sebelum bisa submit.</p>
          )}
        </form>
      </div>
    </main>
  );
}
