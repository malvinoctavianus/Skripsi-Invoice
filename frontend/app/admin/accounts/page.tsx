"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { useAllUsers } from "@/lib/useUsers";
import { Role, roleLabel } from "@/lib/contract";
import { formatDateTime } from "@/lib/format";
import { cardClass, roleBadgeClass } from "@/lib/ui";

export default function AdminAccountsPage() {
  return (
    <RoleGuard role={Role.Admin}>
      <AccountsList />
    </RoleGuard>
  );
}

function AccountsList() {
  const { users, isLoading } = useAllUsers();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-6 py-10">
      <Link href="/admin" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Dashboard Admin
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Akun Terdaftar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Semua wallet yang terdaftar di smart contract ({users.length}).
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Memuat akun...</p>}

      {!isLoading && (
        <div className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Terdaftar Sejak</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.wallet} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{user.wallet}</td>
                  <td className="px-4 py-3 text-slate-700">{user.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        roleBadgeClass[roleLabel(user.role)] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(user.registeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
