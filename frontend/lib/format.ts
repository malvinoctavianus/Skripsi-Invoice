const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number | bigint): string {
  return rupiahFormatter.format(typeof amount === "bigint" ? Number(amount) : amount);
}

export function formatDateTime(unixSeconds: number | bigint): string {
  const ms = Number(unixSeconds) * 1000;
  return new Date(ms).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Long-form date only (e.g. "17 Juli 2026"), for formal document text. */
export function formatDateLong(unixSeconds: number | bigint): string {
  const ms = Number(unixSeconds) * 1000;
  return new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
