export function validatePassword(v: string): string {
  if (!v) return "Пароль обязателен";
  if (v.length < 6) return "Минимум 6 символов";
  return "";
}

export function validatePasswordConfirm(
  confirm: string,
  password: string,
): string {
  if (!confirm) return "Подтвердите пароль";
  if (confirm !== password) return "Пароли не совпадают";
  return "";
}
