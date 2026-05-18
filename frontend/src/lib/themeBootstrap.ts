export function bootstrapTheme(): void {
  try {
    const raw = localStorage.getItem("theme");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { dark?: boolean } };
      const isDark = Boolean(parsed.state?.dark);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      return;
    }
  } catch {}
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "light";
}
