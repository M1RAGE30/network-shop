import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { LogOut } from "lucide-react";
import PhoneInput from "../components/PhoneInput";
import { resolveMediaUrl } from "../lib/media";
import MediaImage from "../components/MediaImage";

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { data } = await api.put("/auth/me", {
        name,
        email,
        phone: phone || null,
        address: null,
        avatarUrl: avatarUrl || null,
      });
      return data;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setSaved("Профиль обновлен");
      setError("");
    },
    onError: (err: any) => {
      setSaved("");
      setError(err.response?.data?.message || "Не удалось сохранить профиль");
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
        email,
        phone: phone || null,
        address: null,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved("");
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Имя и email обязательны");
      return;
    }
    saveProfile.mutate();
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ns-text tracking-tight">
          Профиль
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center ${
              avatarUrl
                ? "bg-ns-input"
                : "bg-ns-hover text-ns-text"
            }`}
          >
            {avatarUrl ? (
              <MediaImage src={avatarUrl} alt={name} className="w-full h-full object-cover" />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-ns-text mb-2">
              Имя
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={user.role === "ADMIN"}
              className={`w-full bg-ns-input rounded-xl px-4 py-3 text-sm text-ns-text focus:outline-none focus:ring-2 focus:ring-ns-accent ${
                user.role === "ADMIN" ? "opacity-70 cursor-not-allowed" : ""
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ns-text mb-2">
              Эл. почта
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={user.role === "ADMIN"}
              className={`w-full bg-ns-input rounded-xl px-4 py-3 text-sm text-ns-text focus:outline-none focus:ring-2 focus:ring-ns-accent ${
                user.role === "ADMIN" ? "opacity-70 cursor-not-allowed" : ""
              }`}
            />
          </div>
          <div className="sm:col-span-2">
            <PhoneInput value={phone} onChange={setPhone} touched={false} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {saved && <p className="text-xs text-green-600 font-medium">{saved}</p>}

        <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
