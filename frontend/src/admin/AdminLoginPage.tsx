import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  authCard,
  authErrorBox,
  authFieldError,
  authFooter,
  authForm,
  authHeader,
  authInputCls,
  authLabel,
  authPageWrap,
  authSubmitBtn,
  authSubtitle,
  authTitle,
} from "../lib/authFormStyles";
import { SHOP_ORIGIN } from "../lib/appOrigins";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { Eye, EyeOff } from "lucide-react";

const validateEmail = (v: string) =>
  !v
    ? "Эл. почта обязательна"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? "Некорректный email"
      : "";
const validatePassword = (v: string) =>
  !v ? "Пароль обязателен" : v.length < 6 ? "Минимум 6 символов" : "";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAuth, user } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const errors = {
    email: validateEmail(form.email),
    password: validatePassword(form.password),
  };
  const isValid = !errors.email && !errors.password;
  const touch = (f: string) => setTouched((p) => ({ ...p, [f]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    setLoading(true);
    setServerError("");
    try {
      const { data } = await api.post("/auth/login", form);
      if (data.user.role !== "ADMIN") {
        setServerError("Доступ только для администраторов");
        return;
      }
      setAuth(data.user, data.token);
      navigate("/admin", { replace: true });
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === "EMAIL_NOT_VERIFIED" && data?.email) {
        setServerError("Подтвердите email в магазине перед входом в админку");
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
          <h1 className={authTitle}>Админ-панель</h1>
          <p className={authSubtitle}>Вход для администраторов NetworkShop</p>
        </div>
        <form onSubmit={handleSubmit} className={authForm} noValidate>
          {serverError && <div className={authErrorBox}>{serverError}</div>}
          <div>
            <label className={authLabel}>Эл. почта</label>
            <input
              type="email"
              className={authInputCls(!!touched.email && !!errors.email)}
              value={form.email}
              onChange={(e) => {
                setForm((p) => ({ ...p, email: e.target.value }));
                setServerError("");
              }}
              onBlur={() => touch("email")}
              placeholder="admin@networkshop.by"
              autoComplete="username"
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
                onChange={(e) => {
                  setForm((p) => ({ ...p, password: e.target.value }));
                  setServerError("");
                }}
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
            <a
              href={SHOP_ORIGIN}
              className="text-ns-text underline underline-offset-2 font-medium"
            >
              Вернуться в магазин
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
