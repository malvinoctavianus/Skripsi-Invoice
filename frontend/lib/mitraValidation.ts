/** Letters (plus spaces and basic name punctuation) only - no digits allowed. */
export function isLettersOnly(value: string): boolean {
  return /^[A-Za-z\s.'-]+$/.test(value.trim());
}

/** Must contain at least one letter AND at least one digit. */
export function isAlphanumericMix(value: string): boolean {
  return /[A-Za-z]/.test(value) && /\d/.test(value);
}

/** Exactly 16 digits (KTP/SIM number format). */
export function isValidIdNumber(value: string): boolean {
  return /^\d{16}$/.test(value.trim());
}
