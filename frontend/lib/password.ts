export const PASSWORD_HINT =
  "Minimal 6 karakter, harus mengandung kombinasi angka dan huruf besar.";

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "Password minimal 6 karakter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password harus mengandung minimal satu huruf besar.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password harus mengandung minimal satu angka.";
  }
  return null;
}
