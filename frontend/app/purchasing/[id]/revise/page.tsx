"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CurrencyInput } from "@/components/CurrencyInput";
import { RoleGuard } from "@/components/RoleGuard";
import { useInvoice } from "@/lib/useInvoices";
import { INVOICE_ABI, INVOICE_ADDRESS, Invoice, InvoiceStatus, Role } from "@/lib/contract";
import { PURCHASING_NAV } from "@/lib/navigation";
import { formatRupiah } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

type ItemRow = { name: string; qty: string; unitPrice: string };

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

export default function ReviseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGuard role={Role.Purchasing} navItems={PURCHASING_NAV}>
      <ReviseInvoiceForm params={params} />
    </RoleGuard>
  );
}

function ReviseInvoiceForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useAccount();
  const { data, isLoading } = useInvoice(BigInt(id));
  const invoice = data as Invoice | undefined;

  const [now] = useState(() => new Date());
  const minDate = addDays(now, -MAX_DAYS_BACK);
  const maxDate = addDays(now, MAX_DAYS_FORWARD);

  const [supplierName, setSupplierName] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateValue(now));
  const [items, setItems] = useState<ItemRow[]>([{ name: "", qty: "1", unitPrice: "0" }]);
  const [dpAmount, setDpAmount] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!invoice || initialized) return;
    setSupplierName(invoice.supplierName);
    setItems(
      invoice.items.map((item) => ({
        name: item.name,
        qty: item.qty.toString(),
        unitPrice: item.unitPrice.toString(),
      }))
    );
    setDpAmount(invoice.dpAmount.toString());
    setInitialized(true);
  }, [invoice, initialized]);

  useEffect(() => {
    if (isSuccess) {
      router.push(`/purchasing/${id}`);
    }
  }, [isSuccess, id, router]);

  const backLink = (
    <Link href={`/purchasing/${id}`} className="text-sm text-slate-500 transition-colors hover:text-slate-900">
      &larr; Kembali ke Detail Invoice
    </Link>
  );

  if (isLoading || !initialized) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-slate-500">Memuat invoice...</p>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Invoice tidak ditemukan.</p>
      </main>
    );
  }

  const isRejected =
    invoice.status === InvoiceStatus.RejectedByFinance || invoice.status === InvoiceStatus.RejectedByManager;

  if (!isRejected) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Invoice ini tidak berstatus ditolak, tidak bisa direvisi.</p>
      </main>
    );
  }

  if (address?.toLowerCase() !== invoice.purchasing.toLowerCase()) {
    return (
      <main className="flex w-full max-w-2xl flex-col gap-4 px-8 py-10">
        {backLink}
        <p className="text-sm text-red-600">Hanya wallet pembuat invoice ini yang bisa merevisinya.</p>
      </main>
    );
  }

  const inv = invoice;

  const total = items.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + qty * unitPrice;
  }, 0);
  const dp = Number(dpAmount) || 0;
  const remaining = total - dp;

  function updateItemPrice(index: number, unitPrice: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, unitPrice } : item)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!INVOICE_ADDRESS) {
      setFormError("Alamat smart contract invoice belum diset (NEXT_PUBLIC_INVOICE_ADDRESS).");
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

    if (dp > total) {
      setFormError("DP tidak boleh lebih besar dari total.");
      return;
    }

    writeContract({
      abi: INVOICE_ABI,
      address: INVOICE_ADDRESS,
      functionName: "reviseInvoice",
      args: [
        inv.id,
        supplierName,
        BigInt(Math.floor(invoiceDateTime.getTime() / 1000)),
        items.map((item) => ({
          name: item.name,
          qty: BigInt(item.qty),
          unitPrice: BigInt(item.unitPrice || "0"),
        })),
        BigInt(dp),
      ],
    });
  }

  return (
    <main className="flex w-full max-w-2xl flex-col gap-5 px-8 py-10">
      {backLink}

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">
            Revisi Invoice INV-{invoice.id.toString().padStart(4, "0")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Perbaiki data di bawah lalu ajukan ulang. Invoice akan kembali ke tahap "Menunggu
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
            Nama Pemasok
            <input value={supplierName} disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
            <span className="text-xs font-normal text-slate-400">
              Tidak bisa diubah saat revisi. Kalau nama pemasoknya memang salah, buat invoice baru.
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Data Barang</span>
            <p className="text-xs text-slate-400">
              Nama barang dan qty tidak bisa diubah saat revisi, hanya harga satuan.
            </p>
            <div className="flex flex-col gap-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_120px] items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Nama Barang
                    <input value={item.name} disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Qty
                    <input value={item.qty} disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Harga Satuan
                    <CurrencyInput
                      value={item.unitPrice}
                      onChange={(raw) => updateItemPrice(index, raw)}
                      placeholder="Rp 0"
                      className={inputClass}
                    />
                  </label>
                </div>
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
