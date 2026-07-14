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
