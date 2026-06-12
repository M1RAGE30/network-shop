import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import {
  validatePassword,
  validatePasswordConfirm,
} from "../lib/passwordValidation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token")?.trim() || "";

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successRedirecting, setSuccessRedirecting] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setTokenValid(false);
      return;
    }
    api
      .get("/auth/reset-password/validate", { params: { token } })
      .then((r) => setTokenValid(!!r.data.valid))
      .catch(() => setTokenValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const errors = {
    password: validatePassword(password),
    confirmPassword: validatePasswordConfirm(confirmPassword, password),
  };
  const isValid = !errors.password && !errors.confirmPassword;
  const touch = (f: string) => setTouched((p) => ({ ...p, [f]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    if (!isValid || !token) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccessRedirecting(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1800);
      return;
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Не удалось обновить пароль",
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className={authPageWrap}>
        <div className={`${authCard} flex justify-center py-16`}>
          <Loader2
            className="h-8 w-8 animate-spin text-ns-muted"
            strokeWidth={1.75}
            aria-label="Проверка ссылки"
          />
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className={authPageWrap}>
        <div className={authCard}>
          <div className={authHeader}>
            <h1 className={authTitle}>Ссылка недействительна</h1>
            <p className={authSubtitle}>
              Запросите сброс пароля ещё раз – предыдущая ссылка истекла или уже
              использована.
            </p>
          </div>
          <p className={authFooter}>
            <Link to="/forgot-password" className={authLink}>
              Запросить новую ссылку
            </Link>
            {" · "}
            <Link to="/login" className={authLink}>
              Вход
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (successRedirecting) {
    return (
      <div className={authPageWrap}>
        <div className={`${authCard} space-y-5 text-center`}>
          <div className="flex justify-center">
            <Loader2
              className="h-9 w-9 animate-spin text-ns-muted"
              strokeWidth={1.75}
              aria-label="Переход на страницу входа"
            />
          </div>
          <div className={authSuccessBox}>
            Пароль успешно обновлён. Сейчас вы будете перенаправлены на страницу
            входа.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={authPageWrap}>
      <div className={authCard}>
        <div className={authHeader}>
          <h1 className={authTitle}>Новый пароль</h1>
          <p className={authSubtitle}>Придумайте новый пароль для входа</p>
        </div>

        <form onSubmit={handleSubmit} className={authForm} noValidate>
          {error && <div className={authErrorBox}>{error}</div>}
          <div>
            <label className={authLabel}>Новый пароль</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                className={
                  authInputCls(!!touched.password && !!errors.password) +
                  " pr-11"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onBlur={() => touch("password")}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
                aria-label={showPass ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPass ? (
                  <EyeOff size={18} strokeWidth={1.5} />
                ) : (
                  <Eye size={18} strokeWidth={1.5} />
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className={authFieldError}>{errors.password}</p>
            )}
          </div>
          <div>
            <label className={authLabel}>Подтверждение пароля</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                className={
                  authInputCls(
                    !!touched.confirmPassword && !!errors.confirmPassword,
                  ) + " pr-11"
                }
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                onBlur={() => touch("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
                aria-label={showConfirm ? "Скрыть пароль" : "Показать пароль"}
              >
                {showConfirm ? (
                  <EyeOff size={18} strokeWidth={1.5} />
                ) : (
                  <Eye size={18} strokeWidth={1.5} />
                )}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p className={authFieldError}>{errors.confirmPassword}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className={authSubmitBtn}
          >
            {loading ? "Сохранение..." : "Обновить пароль"}
          </button>
          <p className={authFooter}>
            <Link to="/login" className={authLink}>
              Вернуться ко входу
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
