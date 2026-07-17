"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { decodeEventLog } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CurrencyInput } from "@/components/CurrencyInput";
import { RoleGuard } from "@/components/RoleGuard";
import { INVOICE_ABI, INVOICE_ADDRESS, PaymentMethod, paymentMethodLabel, Role } from "@/lib/contract";
import { PURCHASING_NAV } from "@/lib/navigation";
import { useApprovedSuppliers } from "@/lib/useSuppliers";
import { formatRupiah } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type ItemRow = { name: string; qty: string; unitPrice: string };

type Draft = {
  supplierName: string;
  selectedDate: string;
  items: ItemRow[];
  dpAmount: string;
  keterangan: string;
  paymentMethod: PaymentMethod | null;
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
  return (
    <RoleGuard role={Role.Purchasing} navItems={PURCHASING_NAV}>
      <NewInvoiceForm />
    </RoleGuard>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const minDate = addDays(now, -MAX_DAYS_BACK);
  const maxDate = addDays(now, MAX_DAYS_FORWARD);

  const { suppliers } = useApprovedSuppliers();
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
  const [keterangan, setKeterangan] = useState(draft?.keterangan ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(draft?.paymentMethod ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    const data: Draft = { supplierName, selectedDate, items, dpAmount, keterangan, paymentMethod };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [supplierName, selectedDate, items, dpAmount, keterangan, paymentMethod]);

  useEffect(() => {
    if (!isSuccess || !receipt) return;

    window.localStorage.removeItem(DRAFT_KEY);

    let newInvoiceId: bigint | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: INVOICE_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === "InvoiceCreated") {
          newInvoiceId = (decoded.args as unknown as { id: bigint }).id;
          break;
        }
      } catch {
        // not our event, ignore
      }
    }

    router.push(newInvoiceId ? `/purchasing/${newInvoiceId}` : "/purchasing");
  }, [isSuccess, receipt, router]);

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
    // Real submit time (jam:menit:detik) tetap ikut tercatat di invoiceDate, walau tidak
    // ditampilkan sebagai field terpisah di form ini.
    const invoiceDateTime = new Date(datePart);
    invoiceDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

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
        keterangan.trim(),
        paymentMethod,
      ],
    });
  }

  return (
    <main className="flex w-full max-w-2xl flex-col gap-5 px-8 py-10">
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
              Jam submit tetap tercatat otomatis di blockchain.
            </span>
          </label>

          <label className={labelClass}>
            Nama Pemasok
            {suppliers.length === 0 ? (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">Belum ada data supplier</p>
                <p className="text-xs text-amber-700">
                  Invoice tidak bisa dibuat sebelum ada supplier yang disetujui Admin. Tambahkan
                  supplier dulu, lalu tunggu Admin menyetujuinya.
                </p>
                <Link
                  href="/purchasing/suppliers/new"
                  className="self-start text-sm font-semibold text-amber-800 underline hover:text-amber-900"
                >
                  + Tambah Supplier
                </Link>
              </div>
            ) : (
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id.toString()} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            )}
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
            Keterangan
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={3}
              placeholder="mis. Pembelian ATK untuk kebutuhan operasional bulan ini"
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

          <button
            type="submit"
            disabled={
              isPending || isConfirming || supplierName.trim().length === 0 || paymentMethod === null
            }
            className={primaryButtonClass}
          >
            {isPending
              ? "Menunggu konfirmasi MetaMask..."
              : isConfirming
                ? "Mengirim ke blockchain..."
                : "Submit Invoice"}
          </button>
          {supplierName.trim().length === 0 && (
            <p className="text-xs text-slate-400">Pilih nama pemasok dulu sebelum bisa submit.</p>
          )}
          {supplierName.trim().length > 0 && paymentMethod === null && (
            <p className="text-xs text-slate-400">Pilih metode pembayaran dulu sebelum bisa submit.</p>
          )}
        </form>
      </div>
    </main>
  );
}
