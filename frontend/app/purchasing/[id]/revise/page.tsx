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
import { useAllSuppliers } from "@/lib/useSuppliers";
import { formatRupiah } from "@/lib/format";
import { cardClass, errorAlertClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

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
  const { suppliers } = useAllSuppliers();

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
      functionName: "reviseInvoice",
      args: [
        inv.id,
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
            {suppliers.length === 0 ? (
              <>
                <select disabled className={`${inputClass} bg-slate-50 text-slate-400`}>
                  <option>Belum ada data supplier</option>
                </select>
                <span className="text-xs font-normal text-slate-400">
                  Tambahkan supplier dulu di menu{" "}
                  <Link href="/purchasing/suppliers/new" className="text-blue-600 hover:underline">
                    Data Supplier
                  </Link>
                  .
                </span>
              </>
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
