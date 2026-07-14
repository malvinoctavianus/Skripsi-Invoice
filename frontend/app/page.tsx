"use client";

import Link from "next/link";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { roleLabel } from "@/lib/contract";
import { cardClass, primaryButtonClass, roleBadgeClass } from "@/lib/ui";

export default function HomePage() {
  const { isConnected, isLoading, isAdmin, isRegistered, username, role, address } =
    useCurrentUser();

  const roleName = isAdmin ? "Admin" : roleLabel(role);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm">
          IA
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sistem Approval Invoice
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          Autentikasi menggunakan wallet MetaMask. Setiap persetujuan invoice tercatat dan
          terverifikasi secara permanen di blockchain.
        </p>
      </div>

      <ConnectWalletButton />

      {isConnected && isLoading && (
        <p className="text-sm text-slate-500">Memeriksa status wallet...</p>
      )}

      {isConnected && !isLoading && (
        <div className={`${cardClass} w-full text-left`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Wallet Terhubung
              </p>
              <p className="mt-1 font-mono text-sm text-slate-700">{address}</p>
            </div>
            {(isAdmin || isRegistered) && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  roleBadgeClass[roleName] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {roleName}
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="pt-4">
              <p className="text-sm text-slate-600">
                Anda masuk sebagai Admin. Kelola akses karyawan dari sini.
              </p>
              <Link href="/admin" className={`${primaryButtonClass} mt-4 w-full`}>
                Buka Dashboard Admin
              </Link>
            </div>
          )}

          {!isAdmin && isRegistered && (
            <div className="pt-4">
              <p className="text-sm text-slate-600">
                Selamat datang kembali, <strong className="text-slate-900">{username}</strong>.
              </p>
              <Link href="/login" className={`${primaryButtonClass} mt-4 w-full`}>
                Lanjut ke Login
              </Link>
            </div>
          )}

          {!isAdmin && !isRegistered && (
            <div className="flex items-start gap-2.5 pt-4">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              <p className="text-sm text-red-600">
                Wallet ini belum terdaftar. Hubungi Admin perusahaan untuk registrasi.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
