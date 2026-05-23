import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isAdminApp } from "../lib/appOrigins";
import { redirectToAdminWithAuth } from "../lib/adminAuth";
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
  authTitle,
} from "../lib/authFormStyles";
import api from "../lib/api";
import {
  clearLoginReturnAdmin,
  wantsLoginReturnAdmin,
} from "../lib/loginReturn";
import { useAuthStore } from "../store/authStore";
import { Eye, EyeOff } from "lucide-react";

interface FieldErrors {
  email?: string;
  password?: string;
}

const validateEmail = (v: string) =>
  !v
    ? "Эл. почта обязательна"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? "Некорректный email"
      : "";
const validatePassword = (v: string) =>
  !v ? "Пароль обязателен" : v.length < 6 ? "Минимум 6 символов" : "";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth, user, token } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (
      wantsLoginReturnAdmin(searchParams) &&
      user?.role === "ADMIN" &&
      token
    ) {
      clearLoginReturnAdmin();
      redirectToAdminWithAuth(user, token);
    }
  }, [searchParams, user, token]);

  const errors: FieldErrors = {
    email: validateEmail(form.email),
    password: validatePassword(form.password),
  };
  const isValid = !errors.email && !errors.password;
  const touch = (f: string) => setTouched((p) => ({ ...p, [f]: true }));
  const handleChange = (f: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [f]: v }));
    setServerError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setAuth(data.user, data.token);
      if (
        data.user.role === "ADMIN" &&
        (wantsLoginReturnAdmin(searchParams) || isAdminApp)
      ) {
        clearLoginReturnAdmin();
        redirectToAdminWithAuth(data.user, data.token);
        return;
      }
      navigate("/");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === "EMAIL_NOT_VERIFIED" && data?.email) {
        navigate(
          `/verify-email?email=${encodeURIComponent(data.email)}`,
          {
            replace: true,
            state: {
              verifyNotice: data.message || "Код отправлен на почту",
            },
          },
        );
        return;
      }
      setServerError(data?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={authPageWrap}>
      <div className={authCard}>
        <div className={authHeader}>
          <h1 className={authTitle}>Вход</h1>
          <p className={authSubtitle}>Войдите в свой аккаунт NetworkShop</p>
        </div>
        <form onSubmit={handleSubmit} className={authForm} noValidate>
          {serverError && <div className={authErrorBox}>{serverError}</div>}
          <div>
            <label className={authLabel}>Эл. почта</label>
            <input
              type="email"
              className={authInputCls(!!touched.email && !!errors.email)}
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => touch("email")}
              placeholder="name@mail.com"
            />
            {touched.email && errors.email && (
              <p className={authFieldError}>{errors.email}</p>
            )}
          </div>
          <div>
            <label className={authLabel}>Пароль</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                className={
                  authInputCls(!!touched.password && !!errors.password) +
                  " pr-11"
                }
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => touch("password")}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
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
          <button
            type="submit"
            disabled={loading || !form.email || !form.password}
            className={authSubmitBtn}
          >
            {loading ? "Вход..." : "Войти"}
          </button>
          <p className={authFooter}>
            Нет аккаунта?{" "}
            <Link to="/register" className={authLink}>
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
