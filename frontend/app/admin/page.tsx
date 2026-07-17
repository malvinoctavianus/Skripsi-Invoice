"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { StatCard } from "@/components/StatCard";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useAllInvoices } from "@/lib/useInvoices";
import { useAllUsers } from "@/lib/useUsers";
import { InvoiceStatus, Role } from "@/lib/contract";
import { ADMIN_NAV } from "@/lib/navigation";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default function AdminPage() {
  return (
    <RoleGuard role={Role.Admin} navItems={ADMIN_NAV}>
      <AdminDashboard />
    </RoleGuard>
  );
}

function AdminDashboard() {
  const { username } = useCurrentUser();
  const { invoices } = useAllInvoices();
  const { users } = useAllUsers();

  const pendingCount = invoices.filter(
    (inv) => inv.status === InvoiceStatus.PendingFinance || inv.status === InvoiceStatus.PendingManager
  ).length;
  const approvedCount = invoices.filter((inv) => inv.status === InvoiceStatus.Approved).length;

  return (
    <main className="flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Masuk sebagai <strong className="text-slate-700">{username || "Admin"}</strong>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Akun Terdaftar"
          value={users.length}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          }
        />
        <StatCard
          label="Invoice Menunggu Approval"
          value={pendingCount}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
            </svg>
          }
        />
        <StatCard
          label="Invoice Approved"
          value={approvedCount}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${cardClass} flex flex-col items-start gap-3`}>
          <h2 className="text-sm font-semibold text-slate-800">Manajemen User</h2>
          <p className="text-sm text-slate-500">
            Daftarkan wallet baru untuk karyawan Purchasing, Finance, atau Manager.
          </p>
          <Link href="/register" className={primaryButtonClass}>
            Buka Halaman Register User
          </Link>
        </div>

        <div className={`${cardClass} flex flex-col items-start gap-3`}>
          <h2 className="text-sm font-semibold text-slate-800">Akun Terdaftar</h2>
          <p className="text-sm text-slate-500">
            Lihat semua wallet yang sudah terdaftar beserta role dan tanggal daftarnya.
          </p>
          <Link href="/admin/accounts" className={primaryButtonClass}>
            Lihat Akun Terdaftar
          </Link>
        </div>

      </div>
    </main>
  );
}
