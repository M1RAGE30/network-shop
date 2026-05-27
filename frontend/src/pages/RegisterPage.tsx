import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Eye, EyeOff, Check, X } from "lucide-react";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const validators = {
  name: (v: string) =>
    !v.trim()
      ? "Имя обязательно"
      : v.trim().length < 2
        ? "Минимум 2 символа"
        : "",
  email: (v: string) =>
    !v
      ? "Эл. почта обязательна"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? "Некорректный email"
        : "",
  password: (v: string) =>
    !v ? "Пароль обязателен" : v.length < 6 ? "Минимум 6 символов" : "",
  confirmPassword: (v: string, pass: string) =>
    !v ? "Подтвердите пароль" : v !== pass ? "Пароли не совпадают" : "",
};

const passwordRules = [
  { label: "Минимум 6 символов", test: (v: string) => v.length >= 6 },
  { label: "Содержит букву", test: (v: string) => /[a-zA-Zа-яА-Я]/.test(v) },
  { label: "Содержит цифру", test: (v: string) => /\d/.test(v) },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");
  const [nameTakenError, setNameTakenError] = useState("");
  const [loading, setLoading] = useState(false);

  const errors: FieldErrors = {
    name: validators.name(form.name),
    email: validators.email(form.email),
    password: validators.password(form.password),
    confirmPassword: validators.confirmPassword(
      form.confirmPassword,
      form.password,
    ),
  };
  const isValid = !Object.values(errors).some(Boolean);
  const touch = (f: string) => setTouched((p) => ({ ...p, [f]: true }));
  const handleChange = (f: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [f]: v }));
    setServerError("");
    if (f === "name") setNameTakenError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    if (!isValid) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        email: form.email,
        password: form.password,
        name: form.name,
      });
      navigate(
        `/verify-email?email=${encodeURIComponent(data.email || form.email)}`,
        { replace: true, state: { codeSent: true } },
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || "Ошибка регистрации";
      if (msg === "Данное имя уже занято") {
        setNameTakenError(msg);
        setServerError("");
        setTouched((p) => ({ ...p, name: true }));
      } else {
        setNameTakenError("");
        setServerError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={authPageWrap}>
      <div className={authCard}>
        <div className={authHeader}>
          <h1 className={authTitle}>Регистрация</h1>
          <p className={authSubtitle}>Создайте аккаунт NetworkShop</p>
        </div>
        <form onSubmit={handleSubmit} className={authForm} noValidate>
          {serverError && <div className={authErrorBox}>{serverError}</div>}
          <div>
            <label className={authLabel}>Имя</label>
            <input
              type="text"
              className={authInputCls(
                !!(touched.name && errors.name) || !!nameTakenError,
              )}
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => touch("name")}
              placeholder="Иван Иванов"
            />
            {((touched.name && errors.name) || nameTakenError) && (
              <p className={authFieldError}>{errors.name || nameTakenError}</p>
            )}
          </div>
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
                autoComplete="new-password"
                className={
                  authInputCls(!!touched.password && !!errors.password) + " pr-11"
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
            {form.password && (
              <ul className="mt-2 space-y-1">
                {passwordRules.map((rule) => (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs font-medium ${
                      rule.test(form.password)
                        ? "text-ns-text"
                        : "text-ns-muted"
                    }`}
                  >
                    {rule.test(form.password) ? (
                      <Check size={11} />
                    ) : (
                      <X size={11} />
                    )}{" "}
                    {rule.label}
                  </li>
                ))}
              </ul>
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
                value={form.confirmPassword}
                onChange={(e) =>
                  handleChange("confirmPassword", e.target.value)
                }
                onBlur={() => touch("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
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
            disabled={loading || !isValid}
            className={authSubmitBtn}
          >
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
          <p className={authFooter}>
            Уже есть аккаунт?{" "}
            <Link to="/login" className={authLink}>
              Войти
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
