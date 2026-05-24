import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { LogOut, Eye, EyeOff, Lock } from "lucide-react";
import PhoneInput from "../components/PhoneInput";
import { resolveMediaUrl } from "../lib/media";
import MediaImage from "../components/MediaImage";
import {
  authErrorBox,
  authFieldError,
  authLabel,
  authSuccessBox,
} from "../lib/authFormStyles";
import { inputCls } from "../lib/uiClasses";
import {
  validatePassword,
  validatePasswordConfirm,
} from "../lib/passwordValidation";

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passTouched, setPassTouched] = useState<Record<string, boolean>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSaved, setPassSaved] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPassTouched({});
    setPassError("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const closePasswordForm = () => {
    setShowPasswordForm(false);
    resetPasswordForm();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { data } = await api.put("/auth/me", {
        name,
        phone: phone || null,
        address: user?.address ?? null,
        avatarUrl: avatarUrl || null,
      });
      return data;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setSaved("Профиль обновлён");
      setError("");
    },
    onError: (err: any) => {
      setSaved("");
      setError(err.response?.data?.message || "Не удалось сохранить профиль");
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const { data } = await api.put("/auth/me/password", {
        currentPassword,
        newPassword,
      });
      return data;
    },
    onSuccess: () => {
      setPassSaved("Пароль изменён");
      setPassError("");
      setShowPasswordForm(false);
      resetPasswordForm();
    },
    onError: (err: any) => {
      setPassSaved("");
      setPassError(err.response?.data?.message || "Не удалось изменить пароль");
    },
  });

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setSaved("");
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post("/upload/image", fd);
      setAvatarUrl(resolveMediaUrl(data.url) ?? data.url);
    } catch {
      setError("Не удалось загрузить аватар");
    } finally {
      setUploading(false);
    }
  };

  const resetAvatar = useMutation({
    mutationFn: async () => {
      const { data } = await api.put("/auth/me", {
        name,
        phone: phone || null,
        address: user?.address ?? null,
        avatarUrl: null,
      });
      return data;
    },
    onSuccess: (updatedUser) => {
      setAvatarUrl("");
      updateUser(updatedUser);
      setSaved("Аватар сброшен");
      setError("");
    },
    onError: (err: any) => {
      setSaved("");
      setError(err.response?.data?.message || "Не удалось сбросить аватар");
    },
  });

  const avatarInitial = (name.trim() || "?").slice(0, 1).toUpperCase();

  const passErrors = {
    currentPassword: !currentPassword ? "Введите текущий пароль" : "",
    newPassword: validatePassword(newPassword),
    confirmPassword: validatePasswordConfirm(confirmPassword, newPassword),
  };
  const passValid =
    !passErrors.currentPassword &&
    !passErrors.newPassword &&
    !passErrors.confirmPassword;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved("");
    setError("");
    if (!name.trim()) {
      setError("Имя обязательно");
      return;
    }
    saveProfile.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
    setPassSaved("");
    setPassError("");
    if (!passValid) return;
    changePassword.mutate();
  };

  if (!user) return null;

  const passwordInputCls = (hasError: boolean) =>
    `${inputCls} pr-11 ${hasError ? "ring-2 ring-ns-error" : ""}`;

  return (
    <div className="mx-auto w-full max-w-xl pb-8 space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ns-text tracking-tight">
          Профиль
        </h1>
      </div>

      <div className="aurora-card overflow-hidden">
      <form
        onSubmit={handleProfileSubmit}
        className="p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center ${
              avatarUrl ? "bg-ns-input" : "bg-ns-hover text-ns-text"
            }`}
          >
            {avatarUrl ? (
              <MediaImage
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-semibold">{avatarInitial}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ns-text cursor-pointer w-fit">
              {uploading ? "Загрузка..." : "Изменить аватар"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading || resetAvatar.isPending}
                onChange={(e) => handleAvatarUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => resetAvatar.mutate()}
                disabled={
                  uploading || resetAvatar.isPending || saveProfile.isPending
                }
                className="text-sm font-medium text-ns-text-secondary hover:text-ns-error transition-colors disabled:opacity-40 w-fit text-left"
              >
                {resetAvatar.isPending ? "Сброс…" : "Сбросить аватар"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={authLabel}>Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAdmin}
              className={`${inputCls} ${isAdmin ? "opacity-70 cursor-not-allowed" : ""}`}
            />
          </div>
          <div>
            <label className={authLabel}>Эл. почта</label>
            <input
              type="email"
              value={user.email}
              readOnly
              disabled
              className={`${inputCls} opacity-70 cursor-not-allowed`}
              aria-describedby="profile-email-hint"
            />
            <p
              id="profile-email-hint"
              className="mt-1.5 text-sm text-ns-text-secondary"
            >
              Изменить email нельзя
            </p>
          </div>
          <div className="sm:col-span-2">
            <PhoneInput value={phone} onChange={setPhone} touched={false} />
          </div>
        </div>

        {error && <div className={authErrorBox}>{error}</div>}
        {saved && <div className={authSuccessBox}>{saved}</div>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={
              saveProfile.isPending || uploading || resetAvatar.isPending
            }
            className="ns-btn ns-btn-primary"
          >
            {saveProfile.isPending ? "Сохранение..." : "Сохранить профиль"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="ns-btn ns-btn-secondary gap-2"
          >
            <LogOut size={15} strokeWidth={1.7} /> Выйти из аккаунта
          </button>
        </div>
      </form>

      <section className="border-t border-ns-border p-4 sm:p-6">
        {passSaved && !showPasswordForm && (
          <div className={`${authSuccessBox} mb-4`}>{passSaved}</div>
        )}

        {!showPasswordForm ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-ns-hover text-ns-icon">
                <Lock size={18} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ns-text">Пароль</p>
                <p className="text-sm text-ns-text-secondary mt-0.5 leading-snug">
                  Регулярно обновляйте пароль для защиты аккаунта
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPassSaved("");
                setShowPasswordForm(true);
              }}
              className="ns-btn ns-btn-secondary w-full sm:w-auto shrink-0"
            >
              Сменить пароль
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ns-text tracking-tight">
                Смена пароля
              </h2>
              <button
                type="button"
                onClick={closePasswordForm}
                disabled={changePassword.isPending}
                className="text-sm font-medium text-ns-text-secondary hover:text-ns-text transition-colors disabled:opacity-40"
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={authLabel}>Текущий пароль</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPassError("");
                    }}
                    onBlur={() =>
                      setPassTouched((p) => ({ ...p, currentPassword: true }))
                    }
                    className={passwordInputCls(
                      !!passTouched.currentPassword &&
                        !!passErrors.currentPassword,
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
                    aria-label={showCurrent ? "Скрыть" : "Показать"}
                  >
                    {showCurrent ? (
                      <EyeOff size={18} strokeWidth={1.5} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {passTouched.currentPassword && passErrors.currentPassword && (
                  <p className={authFieldError}>{passErrors.currentPassword}</p>
                )}
              </div>
              <div>
                <label className={authLabel}>Новый пароль</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPassError("");
                    }}
                    onBlur={() =>
                      setPassTouched((p) => ({ ...p, newPassword: true }))
                    }
                    className={passwordInputCls(
                      !!passTouched.newPassword && !!passErrors.newPassword,
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
                    aria-label={showNew ? "Скрыть" : "Показать"}
                  >
                    {showNew ? (
                      <EyeOff size={18} strokeWidth={1.5} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {passTouched.newPassword && passErrors.newPassword && (
                  <p className={authFieldError}>{passErrors.newPassword}</p>
                )}
              </div>
              <div>
                <label className={authLabel}>Подтверждение пароля</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPassError("");
                    }}
                    onBlur={() =>
                      setPassTouched((p) => ({ ...p, confirmPassword: true }))
                    }
                    className={passwordInputCls(
                      !!passTouched.confirmPassword &&
                        !!passErrors.confirmPassword,
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
                    aria-label={showConfirm ? "Скрыть" : "Показать"}
                  >
                    {showConfirm ? (
                      <EyeOff size={18} strokeWidth={1.5} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {passTouched.confirmPassword && passErrors.confirmPassword && (
                  <p className={authFieldError}>{passErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {passError && <div className={authErrorBox}>{passError}</div>}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="ns-btn ns-btn-primary"
              >
                {changePassword.isPending ? "Сохранение..." : "Сохранить пароль"}
              </button>
              <button
                type="button"
                onClick={closePasswordForm}
                disabled={changePassword.isPending}
                className="ns-btn ns-btn-secondary"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </section>
      </div>
    </div>
  );
}
