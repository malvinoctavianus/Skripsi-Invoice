"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Role } from "@/lib/contract";
import { cardClass } from "@/lib/ui";

export default function ManagerPage() {
  return (
    <RoleGuard role={Role.Manager}>
      <ManagerDashboard />
    </RoleGuard>
  );
}

function ManagerDashboard() {
  const { username } = useCurrentUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard Manager</h1>
        <p className="mt-1 text-sm text-slate-500">
          Login berhasil sebagai <strong className="text-slate-700">{username}</strong>
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
            d="M16.5 3.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM9 19.5v-3a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v3M9 19.5h6M5.25 9.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm18 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
        <p className="font-medium text-slate-700">Finalisasi &amp; Sertifikat NFT Segera Hadir</p>
        <p className="max-w-sm text-sm text-slate-500">
          Fitur antrian approval final Manager beserta penerbitan NFT bukti persetujuan akan
          dibangun pada tahap berikutnya.
        </p>
      </div>
    </main>
  );
}
