"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { Role } from "@/lib/contract";
import {
  DashboardKey,
  loadDashboardSettings,
  saveDashboardSettings,
} from "@/lib/dashboardSettings";
import { cardClass, inputClass, labelClass, primaryButtonClass, successAlertClass } from "@/lib/ui";

const DASHBOARDS: { key: DashboardKey; label: string }[] = [
  { key: "purchasing", label: "Dashboard Purchasing" },
  { key: "finance", label: "Dashboard Finance" },
  { key: "manager", label: "Dashboard Manager" },
];

export default function AdminSettingsPage() {
  return (
    <RoleGuard role={Role.Admin}>
      <SettingsForm />
    </RoleGuard>
  );
}

function SettingsForm() {
  const [settings, setSettings] = useState(() => loadDashboardSettings());
  const [saved, setSaved] = useState(false);

  function updateField(key: DashboardKey, field: "title" | "message", value: string) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveDashboardSettings(settings);
    setSaved(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <Link href="/admin" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
        &larr; Kembali ke Dashboard Admin
      </Link>

      <div className={cardClass}>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Edit Tampilan Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ubah judul dan pesan pengumuman yang tampil di dashboard Purchasing, Finance, dan
            Manager. Perubahan hanya tersimpan di browser ini.
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {DASHBOARDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-3 border-b border-slate-100 pb-6 last:border-0">
              <h2 className="text-sm font-semibold text-slate-800">{label}</h2>
              <label className={labelClass}>
                Judul
                <input
                  value={settings[key].title}
                  onChange={(e) => updateField(key, "title", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Pesan Pengumuman (opsional)
                <textarea
                  value={settings[key].message}
                  onChange={(e) => updateField(key, "message", e.target.value)}
                  rows={2}
                  placeholder="mis. Mohon submit invoice sebelum tanggal 25 tiap bulan."
                  className={inputClass}
                />
              </label>
            </div>
          ))}

          {saved && <p className={successAlertClass}>Tersimpan.</p>}

          <button type="submit" className={primaryButtonClass}>
            Simpan Perubahan
          </button>
        </form>
      </div>
    </main>
  );
}
