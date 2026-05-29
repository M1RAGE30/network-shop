import { useState } from "react";
import { Link } from "react-router-dom";
import {
  authCard,
  authErrorBox,
  authFieldError,
  authFooter,
  authForm,
  authHeader,
  authInputCls,
  authLabel,
  authLink,
  authPageWrap,
  authSubmitBtn,
  authSubtitle,
  authSuccessBox,
  authTitle,
} from "../lib/authFormStyles";
import api from "../lib/api";
import { ArrowLeft, Mail } from "lucide-react";

const validateEmail = (v: string) =>
  !v
    ? "Эл. почта обязательна"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? "Некорректный email"
      : "";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const emailError = validateEmail(email);
  const isValid = !emailError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Не удалось отправить письмо. Попробуйте позже.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={authPageWrap}>
      <div className={authCard}>
        <div className={authHeader}>
          <h1 className={authTitle}>Забыли пароль?</h1>
          <p className={authSubtitle}>
            Укажите email — мы отправим ссылку для сброса пароля
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className={authSuccessBox}>
              Ссылка для сброса пароля отправлена на почту.
              Проверьте входящие и папку «Спам». Ссылка действует 1 час.
            </div>
            <p className={authFooter}>
              <Link to="/login" className={`${authLink} inline-flex items-center gap-1.5`}>
                <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
                Вернуться ко входу
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={authForm} noValidate>
            {error && <div className={authErrorBox}>{error}</div>}
            <div>
              <label className={authLabel}>Эл. почта</label>
              <input
                type="email"
                autoComplete="email"
                className={authInputCls(!!touched && !!emailError)}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onBlur={() => setTouched(true)}
                placeholder="name@mail.com"
              />
              {touched && emailError && (
                <p className={authFieldError}>{emailError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !isValid}
              className={`${authSubmitBtn} gap-2`}
            >
              {loading ? (
                "Отправка..."
              ) : (
                <>
                  <Mail size={18} strokeWidth={1.75} aria-hidden />
                  Отправить ссылку
                </>
              )}
            </button>
            <p className={authFooter}>
              <Link to="/login" className={authLink}>
                Вернуться ко входу
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
