import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() || "";
  const resentOnMount = useRef(false);

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">(
    "form",
  );
  const [message, setMessage] = useState("");
  const [resendNotice, setResendNotice] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email || resentOnMount.current) return;
    resentOnMount.current = true;
    setResending(true);
    api
      .post("/auth/resend-verification", { email })
      .catch(() => {})
      .finally(() => setResending(false));
  }, [email]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendNotice("");
    try {
      await api.post("/auth/resend-verification", { email });
      setResendNotice("Код отправлен повторно");
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
      const { data } = await api.post("/auth/verify-email", { email, code });
      setStatus("success");
      setMessage(data.message);
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
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <XCircle size={40} className="mx-auto text-ns-error" strokeWidth={1.5} />
        <p className="text-ns-text font-semibold">
          Укажите email
        </p>
        <Link
          to="/register"
          className="inline-block text-ns-text underline underline-offset-2 font-medium hover:underline"
        >
          Зарегистрироваться
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-ns-success/15 flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} className="text-ns-success" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold text-ns-text">
          Email подтверждён
        </h1>
        <p className="text-ns-text-secondary">{message}</p>
        <Link
          to="/login"
          className="inline-flex bg-ns-accent text-ns-accent-fg px-8 py-3 rounded-full text-sm font-medium hover:bg-ns-accent-hover transition-colors"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="aurora-card rounded-3xl p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-ns-text mb-2">
            Подтверждение email
          </h1>
          <p className="text-sm text-ns-text-secondary">
            Код отправлен на{" "}
            <span className="font-semibold text-ns-text">
              {email}
            </span>
            . Действует 10 минут.
          </p>
        </div>

        {message && status === "form" && (
          <div className="mb-4 bg-red-50/70 dark:bg-red-900/10 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ns-text mb-2">
              Код из письма
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="ns-input w-full text-center text-2xl tracking-[0.4em] font-semibold"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading" || code.length !== 6}
            className="w-full bg-ns-accent text-ns-accent-fg rounded-full py-3.5 text-base font-medium hover:bg-ns-accent-hover disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
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
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full text-sm text-ns-text underline underline-offset-2 font-medium cursor-pointer hover:text-ns-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resending ? "Отправляем код…" : "Отправить код повторно"}
          </button>
          {resendNotice && (
            <p className="text-xs text-center text-ns-text-secondary">
              {resendNotice}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
