export const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition";

export const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-slate-700";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50";

export const errorAlertClass =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700";

export const successAlertClass =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700";

export const roleBadgeClass: Record<string, string> = {
  Admin: "bg-violet-100 text-violet-700",
  Purchasing: "bg-blue-100 text-blue-700",
  Finance: "bg-emerald-100 text-emerald-700",
  Manager: "bg-amber-100 text-amber-700",
};

export const statusBadgeClass: Record<string, string> = {
  "Menunggu Finance": "bg-amber-100 text-amber-700",
  "Menunggu Manager": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  "Ditolak Finance": "bg-red-100 text-red-700",
  "Ditolak Manager": "bg-red-100 text-red-700",
  "Menunggu Persetujuan": "bg-amber-100 text-amber-700",
  Ditolak: "bg-red-100 text-red-700",
};
