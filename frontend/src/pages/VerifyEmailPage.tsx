import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import {
  authCard,
  authCodeInput,
  authErrorBox,
  authForm,
  authHeader,
  authLabel,
  authLink,
  authPageWrap,
  authSubmitBtn,
  authSubtitle,
  authTitle,
} from "../lib/authFormStyles";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

const RESEND_COOLDOWN_SEC = 60;
const CODE_LENGTH = 6;
const NOTICE_HIDE_MS = 10_000;

type VerifyEmailLocationState = {
  verifyNotice?: string;
  codeSent?: boolean;
} | null;

function normalizeVerificationCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export default function VerifyEmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = searchParams.get("email")?.trim().toLowerCase() || "";

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">(
    "form",
  );
  const [message, setMessage] = useState("");
  const [resendNotice, setResendNotice] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const startResendCooldown = () => setResendCooldown(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (searchParams.get("send") !== "1") return;
    const next = new URLSearchParams(searchParams);
    next.delete("send");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const state = location.state as VerifyEmailLocationState;
    if (!state?.verifyNotice && !state?.codeSent) return;

    if (state.verifyNotice) {
      setResendNotice(state.verifyNotice);
    } else if (state.codeSent) {
      setResendNotice("Код отправлен на почту");
    }

    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null },
    );
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!resendNotice) return;
    const timer = window.setTimeout(() => setResendNotice(""), NOTICE_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [resendNotice]);

  const handleResend = async () => {
    if (!email || resending || resendCooldown > 0) return;
    setResending(true);
    setMessage("");
    setResendNotice("");
    try {
      await api.post("/auth/resend-verification", { email });
      setResendNotice("Код отправлен повторно");
      startResendCooldown();
    } catch (err: any) {
      setResendNotice(
        err.response?.data?.message || "Не удалось отправить код",
      );
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setStatus("loading");
    setMessage("");
    try {
      await api.post("/auth/verify-email", { email, code });
      setStatus("success");
    } catch (err: any) {
      setStatus("form");
      setMessage(err.response?.data?.message || "Ошибка подтверждения");
      if (err.response?.data?.code === "CODE_EXPIRED") {
        handleResend();
      }
    }
  };

  if (!email) {
    return (
      <div className={`${authPageWrap} text-center space-y-4`}>
        <XCircle size={40} className="mx-auto text-ns-error" strokeWidth={1.5} />
        <p className="text-ns-text font-semibold">Укажите email</p>
        <Link to="/register" className={authLink}>
          Зарегистрироваться
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={`${authPageWrap} text-center space-y-5`}>
        <div className="w-16 h-16 rounded-full bg-ns-success/15 flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} className="text-ns-success" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold text-ns-text">Email подтверждён</h1>
        <p className="text-ns-text-secondary text-sm">
          Теперь вы можете войти в свой аккаунт.
        </p>
        <Link to="/login" className="ns-btn ns-btn-primary px-8">
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className={authPageWrap}>
      <div className={authCard}>
        <div className={`${authHeader} !mb-6`}>
          <h1 className={authTitle}>Подтверждение email</h1>
          <p className={`${authSubtitle} leading-relaxed`}>
            Введите шестизначный код из письма.
            <span className="block mt-2 font-semibold text-ns-text break-all">
              {email}
            </span>
            <span className="block mt-1 text-sm text-ns-muted">
              Код действует 10 минут
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className={`${authForm} !space-y-4`}>
          {message && (
            <div className={authErrorBox} role="alert">
              {message}
            </div>
          )}

          <div>
            <label htmlFor="verify-code" className={authLabel}>
              Код из письма
            </label>
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(normalizeVerificationCode(e.target.value))
              }
              onPaste={(e) => {
                e.preventDefault();
                setCode(
                  normalizeVerificationCode(e.clipboardData.getData("text")),
                );
              }}
              className={authCodeInput}
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || code.length !== 6}
            className={`${authSubmitBtn} !mt-1 flex items-center justify-center gap-2 disabled:opacity-40`}
          >
            {status === "loading" ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Проверяем…
              </>
            ) : (
              "Подтвердить"
            )}
          </button>

          <div className="space-y-2 pt-2 border-t border-ns-border/60">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full text-sm font-medium text-ns-text-secondary hover:text-ns-text underline underline-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline disabled:hover:text-ns-text-secondary"
            >
              {resending
                ? "Отправляем код…"
                : resendCooldown > 0
                  ? `Повторная отправка через ${resendCooldown} с`
                  : "Отправить код повторно"}
            </button>
            <p
              className="min-h-[1.125rem] text-xs text-center text-ns-muted transition-opacity duration-200"
              aria-live="polite"
            >
              {resendNotice}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
