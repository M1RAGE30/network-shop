export const authPageWrap = "max-w-[480px] mx-auto py-10 sm:py-12 px-4";
export const authCard = "ns-card-static p-8 sm:p-10";
export const authHeader = "mb-8 text-center";
export const authResendSection = "pt-4 border-t border-ns-border/60";
export const authResendNotice = "mt-1.5 text-center text-xs text-ns-muted";
export const authTitle =
  "text-3xl font-semibold text-ns-text tracking-tight mb-3";
export const authSubtitle = "text-base text-ns-text-secondary";
export const authForm = "space-y-5";
export const authLabel = "block text-sm font-semibold text-ns-text mb-2";
export const authSubmitBtn = "ns-btn ns-btn-primary w-full mt-3";
export const authFooter =
  "text-sm text-center text-ns-text-secondary pt-2";
export const authLink =
  "font-semibold text-ns-accent no-underline hover:text-ns-accent-hover transition-colors";
export const authErrorBox =
  "rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--ns-error)_14%,var(--color-ns-elevated))] px-4 py-3 text-sm font-medium text-[var(--ns-badge-error-fg)]";
export const authSuccessBox =
  "rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--ns-success)_16%,var(--color-ns-elevated))] px-4 py-3 text-sm font-medium text-[var(--ns-badge-success-fg)]";
export const authFieldError = "mt-1.5 text-sm font-medium text-ns-error";
export const authForgotWrap = "flex justify-end -mt-1";
export const authForgotLink =
  "text-sm font-semibold text-ns-accent no-underline hover:text-ns-accent-hover transition-colors";

export const authInputCls = (hasError: boolean) =>
  `ns-input w-full text-sm ${hasError ? "ring-2 ring-ns-error" : ""}`;

export const authCodeInput =
  "ns-input w-full !h-12 font-mono text-xl font-semibold text-center tabular-nums tracking-[0.28em] placeholder:tracking-[0.28em] placeholder:font-mono";
