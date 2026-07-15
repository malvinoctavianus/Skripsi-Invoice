"use client";

function formatDigits(digits: string): string {
  if (digits.length === 0) return "";
  return `Rp ${Number(digits).toLocaleString("id-ID")}`;
}

export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (rawDigits: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      inputMode="numeric"
      value={formatDigits(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder}
      className={className}
    />
  );
}
