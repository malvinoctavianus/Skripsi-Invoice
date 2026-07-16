"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { useAllSuppliers } from "@/lib/useSuppliers";
import { Role } from "@/lib/contract";
import { PURCHASING_NAV } from "@/lib/navigation";
import { formatDateTime } from "@/lib/format";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default function SuppliersPage() {
  return (
    <RoleGuard role={Role.Purchasing} navItems={PURCHASING_NAV}>
      <SuppliersList />
    </RoleGuard>
  );
}

function SuppliersList() {
  const { suppliers, isLoading } = useAllSuppliers();

  return (
    <main className="flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Data Supplier</h1>
          <p className="mt-1 text-sm text-slate-500">
            Daftar supplier yang bisa dipilih saat membuat invoice ({suppliers.length}).
          </p>
        </div>
        <Link href="/purchasing/suppliers/new" className={primaryButtonClass}>
          + Tambah Supplier
        </Link>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Memuat data supplier...</p>}

      {!isLoading && suppliers.length === 0 && (
        <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
          <p className="font-medium text-slate-700">Belum ada supplier</p>
          <p className="max-w-sm text-sm text-slate-500">
            Klik &quot;+ Tambah Supplier&quot; untuk mendaftarkan supplier pertama.
          </p>
        </div>
      )}

      {!isLoading && suppliers.length > 0 && (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Nama Supplier</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">Ditambahkan</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id.toString()} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">{supplier.name}</td>
                  <td className="px-4 py-3 text-slate-600">{supplier.alamat}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(supplier.addedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
