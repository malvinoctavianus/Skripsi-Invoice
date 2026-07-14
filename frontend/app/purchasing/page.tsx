"use client";

import { useAuth } from "@/lib/AuthContext";
import { cardClass } from "@/lib/ui";

export default function PurchasingPage() {
  const { session } = useAuth();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard Purchasing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Login berhasil sebagai <strong className="text-slate-700">{session?.username ?? "..."}</strong>
        </p>
      </div>

      <div className={`${cardClass} flex flex-col items-center gap-2 py-12 text-center`}>
        <svg
          className="h-8 w-8 text-slate-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
          />
        </svg>
        <p className="font-medium text-slate-700">Manajemen Invoice Segera Hadir</p>
        <p className="max-w-sm text-sm text-slate-500">
          Fitur tambah invoice serta daftar invoice pending/approved akan dibangun pada tahap
          berikutnya.
        </p>
      </div>
    </main>
  );
}
