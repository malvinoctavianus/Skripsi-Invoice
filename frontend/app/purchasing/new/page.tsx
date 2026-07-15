"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CurrencyInput } from "@/components/CurrencyInput";
import { INVOICE_ABI, INVOICE_ADDRESS } from "@/lib/contract";
import { formatRupiah } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type ItemRow = { name: string; qty: string; unitPrice: string };

type Draft = {
  supplierName: string;
  selectedDate: string;
  items: ItemRow[];
  dpAmount: string;
};

const DRAFT_KEY = "purchasing-invoice-draft";

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

export default function NewInvoicePage() {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const minDate = addDays(now, -MAX_DAYS_BACK);
  const maxDate = addDays(now, MAX_DAYS_FORWARD);

  const [draft] = useState(() => loadDraft());
  const [supplierName, setSupplierName] = useState(draft?.supplierName ?? "");
  const [selectedDate, setSelectedDate] = useState(() => {
    const initial = draft?.selectedDate ?? toDateValue(now);
    const min = toDateValue(minDate);
    const max = toDateValue(maxDate);
    if (initial < min) return min;
    if (initial > max) return max;
    return initial;
  });
  const [items, setItems] = useState<ItemRow[]>(
    draft?.items ?? [{ name: "", qty: "1", unitPrice: "0" }]
  );
  const [dpAmount, setDpAmount] = useState(draft?.dpAmount ?? "0");
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    const data: Draft = { supplierName, selectedDate, items, dpAmount };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [supplierName, selectedDate, items, dpAmount]);

  useEffect(() => {
    if (isSuccess) {
      window.localStorage.removeItem(DRAFT_KEY);
      router.push("/purchasing");
    }
  }, [isSuccess, router]);

  const total = items.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + qty * unitPrice;
  }, 0);
  const dp = Number(dpAmount) || 0;
  const remaining = total - dp;

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { name: "", qty: "1", unitPrice: "0" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!INVOICE_ADDRESS) {
      setFormError("Alamat smart contract invoice belum diset (NEXT_PUBLIC_INVOICE_ADDRESS).");
      return;
    }
    if (supplierName.trim().length === 0) {
      setFormError("Nama pemasok wajib diisi.");
      return;
    }

    const datePart = new Date(selectedDate);
    if (Number.isNaN(datePart.getTime())) {
      setFormError("Tanggal tidak valid.");
      return;
    }
    const invoiceDateTime = new Date(datePart);
    invoiceDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

    if (toDateValue(datePart) < toDateValue(minDate) || toDateValue(datePart) > toDateValue(maxDate)) {
      setFormError(
        `Tanggal hanya boleh ${MAX_DAYS_BACK} hari ke belakang sampai ${MAX_DAYS_FORWARD} hari ke depan dari hari ini.`
      );
      return;
    }

    const validItems = items.filter((item) => item.name.trim().length > 0);
    if (validItems.length === 0) {
      setFormError("Minimal satu barang harus diisi.");
      return;
    }
    for (const item of validItems) {
      if (!(Number(item.qty) > 0)) {
        setFormError(`Qty untuk "${item.name}" harus lebih dari 0.`);
        return;
      }
    }
    if (dp > total) {
      setFormError("DP tidak boleh lebih besar dari total.");
      return;
    }

    writeContract({
      abi: INVOICE_ABI,
      address: INVOICE_ADDRESS,
      functionName: "createInvoice",
      args: [
        supplierName.trim(),
        BigInt(Math.floor(invoiceDateTime.getTime() / 1000)),
        validItems.map((item) => ({
          name: item.name.trim(),
          qty: BigInt(item.qty),
          unitPrice: BigInt(item.unitPrice || "0"),
        })),
        BigInt(dp),
      ],
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <Link href="/purchasing" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Daftar Invoice
      </Link>

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Tambah Invoice</h1>
          <p className="mt-1 text-sm text-slate-500">
            ID Invoice akan dibuat otomatis oleh smart contract. Setelah submit, invoice akan
            menunggu digital signature (approval) dari Finance lalu Manager.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className={labelClass}>
            ID Invoice
            <input value="Akan dibuat otomatis" disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
          </label>

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
            Nama Pemasok
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="mis. PT Sumber Makmur"
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Data Barang</span>
            <div className="flex flex-col gap-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_120px_auto] items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Nama Barang
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Qty
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(index, { qty: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Harga Satuan
                    <CurrencyInput
                      value={item.unitPrice}
                      onChange={(raw) => updateItem(index, { unitPrice: raw })}
                      placeholder="Rp 0"
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className={`${secondaryButtonClass} h-fit disabled:opacity-30`}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className={`${secondaryButtonClass} self-start`}>
              + Tambah Item
            </button>
          </div>

          <label className={labelClass}>
            DP (Opsional)
            <CurrencyInput value={dpAmount} onChange={setDpAmount} placeholder="Rp 0" className={inputClass} />
          </label>

          <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Total</span>
              <span className="font-medium text-slate-900">{formatRupiah(total)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>DP</span>
              <span className="font-medium text-slate-900">{formatRupiah(dp)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total Pembayaran</span>
              <span className="font-semibold text-slate-900">{formatRupiah(remaining)}</span>
            </div>
          </div>

          {formError && <p className={errorAlertClass}>{formError}</p>}
          {writeError && <p className={errorAlertClass}>{writeError.message.split("\n")[0]}</p>}

          <button type="submit" disabled={isPending || isConfirming} className={primaryButtonClass}>
            {isPending
              ? "Menunggu konfirmasi MetaMask..."
              : isConfirming
                ? "Mengirim ke blockchain..."
                : "Submit Invoice"}
          </button>
        </form>
      </div>
    </main>
  );
}
