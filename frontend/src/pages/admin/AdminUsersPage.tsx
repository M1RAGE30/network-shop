import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { pluralizeUsers } from "../../lib/pluralize";
import ConfirmDialog from "../../components/ConfirmDialog";
import { inputCls, labelCls } from "../../lib/uiClasses";

interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  isEmailVerified: boolean;
  createdAt: string;
  _count: { orders: number };
}
interface EditForm {
  name: string;
  email: string;
  isEmailVerified: boolean;
}

const roleSelectCls =
  "w-fit max-w-full cursor-pointer bg-ns-input rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-ns-text focus:outline-none focus:ring-2 focus:ring-ns-accent disabled:opacity-40 disabled:cursor-not-allowed";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [editId, setEditId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: number | null;
    name: string;
  }>({ open: false, id: null, name: "" });
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    isEmailVerified: false,
  });

  const { data: users = [] } = useQuery<UserRecord[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EditForm> }) =>
      api.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditId(null);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.put(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const openEdit = (u: UserRecord) => {
    setEditId(u.id);
    setEditForm({
      name: u.name,
      email: u.email,
      isEmailVerified: u.isEmailVerified,
    });
  };

  const editingUser = users.find((u) => u.id === editId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ns-muted">
          {pluralizeUsers(users.length)}
        </p>
      </div>

      {editId && editingUser && (
        <div className="aurora-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4">
            <p className="text-lg sm:text-xl font-semibold text-ns-text">
              Редактировать: {editingUser.name}
            </p>
            <button
              onClick={() => setEditId(null)}
              className="p-2 rounded-full hover:bg-ns-hover transition-colors text-ns-text"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Имя</label>
              <input
                className={inputCls}
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>Эл. почта</label>
              <input
                className={inputCls}
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    email: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="email-verified"
              checked={editForm.isEmailVerified}
              onChange={(e) =>
                setEditForm((p) => ({
                  ...p,
                  isEmailVerified: e.target.checked,
                }))
              }
              className="w-5 h-5 rounded accent-ns-accent"
            />
            <label
              htmlFor="email-verified"
              className="text-sm font-medium text-ns-text"
            >
              Эл. почта подтверждена
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() =>
                updateMutation.mutate({
                  id: editId,
                  data: editForm,
                })
              }
              disabled={updateMutation.isPending}
              className="aurora-button flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-transform hover:scale-[1.01] disabled:opacity-40"
            >
              <Check size={16} strokeWidth={1.5} />{" "}
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              onClick={() => setEditId(null)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium ns-chip text-ns-text hover:bg-ns-hover transition-colors"
            >
              <X size={16} strokeWidth={1.5} /> Отмена
            </button>
          </div>
        </div>
      )}

      <div className="aurora-card rounded-3xl overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="ns-table-head">
              <tr>
                {["Пользователь", "Роль", "Почта", "Заказов", "Дата", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-4 text-xs font-semibold text-ns-text"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-ns-border">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="ns-row-hover transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-ns-text">
                      {u.name}
                    </p>
                    <p className="text-xs text-ns-muted">
                      {u.email}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) =>
                        roleMutation.mutate({
                          id: u.id,
                          role: e.target.value,
                        })
                      }
                      className={roleSelectCls}
                    >
                      <option value="USER">Пользователь</option>
                      <option value="ADMIN">Администратор</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full ${u.isEmailVerified ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"}`}
                    >
                      {u.isEmailVerified ? "Подтверждён" : "Не подтверждён"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-ns-text">
                    {u._count.orders}
                  </td>
                  <td className="px-6 py-4 text-xs text-ns-muted">
                    {new Date(u.createdAt).toLocaleDateString("ru-BY")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-2 rounded-full hover:bg-ns-hover transition-colors text-ns-text"
                      >
                        <Pencil size={16} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete({ open: true, id: u.id, name: u.name });
                        }}
                        disabled={u.id === currentUser?.id}
                        className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400 disabled:opacity-30"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y divide-ns-border">
          {users.map((u) => (
            <div key={u.id} className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-semibold text-ns-text text-sm truncate">
                    {u.name}
                  </p>
                  <p className="text-xs text-ns-muted truncate">
                    {u.email}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(u)}
                    className="p-2 rounded-full hover:bg-ns-hover transition-colors text-ns-text"
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({ open: true, id: u.id, name: u.name });
                    }}
                    disabled={u.id === currentUser?.id}
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={u.role}
                  disabled={u.id === currentUser?.id}
                  onChange={(e) =>
                    roleMutation.mutate({ id: u.id, role: e.target.value })
                  }
                  className={roleSelectCls}
                >
                  <option value="USER">Пользователь</option>
                  <option value="ADMIN">Администратор</option>
                </select>
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${u.isEmailVerified ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"}`}
                >
                  {u.isEmailVerified ? "Почта ✓" : "Почта ?"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Удалить пользователя?"
        message={`Пользователь “${confirmDelete.name}” будет удалён без возможности восстановления.`}
        confirmText={deleteMutation.isPending ? "Удаление..." : "Удалить"}
        onCancel={() => setConfirmDelete({ open: false, id: null, name: "" })}
        onConfirm={() => {
          if (confirmDelete.id == null) return;
          deleteMutation.mutate(confirmDelete.id, {
            onSettled: () =>
              setConfirmDelete({ open: false, id: null, name: "" }),
          });
        }}
      />
    </div>
  );
}
