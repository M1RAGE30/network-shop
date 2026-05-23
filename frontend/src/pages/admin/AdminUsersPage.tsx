import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Pencil, Trash2, X, Check, XCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { pluralizeUsers } from "../../lib/pluralize";
import ConfirmDialog from "../../components/ConfirmDialog";
import { inputCls, labelCls } from "../../lib/uiClasses";
import { scrollToFormElement } from "../../lib/scrollToForm";

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
}

const roleSelectCls =
  "w-fit max-w-full cursor-pointer bg-ns-input rounded-[var(--radius-btn)] pl-3 pr-8 py-1.5 text-sm font-semibold text-ns-text focus:outline-none focus:ring-2 focus:ring-ns-accent disabled:opacity-40 disabled:cursor-not-allowed";

function EmailStatusBadge({ verified }: { verified: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium leading-none text-ns-text">
      {verified ? (
        <Check
          size={15}
          strokeWidth={2.25}
          className="shrink-0 text-ns-success"
          aria-hidden
        />
      ) : (
        <XCircle
          size={15}
          strokeWidth={2.25}
          className="shrink-0 text-ns-muted"
          aria-hidden
        />
      )}
      <span>{verified ? "Почта подтверждена" : "Почта не подтверждена"}</span>
    </span>
  );
}

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
  });
  const editFormRef = useRef<HTMLDivElement>(null);

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
    if (u.id === currentUser?.id) return;
    setEditId(u.id);
    setEditForm({
      name: u.name,
      email: u.email,
    });
  };

  useEffect(() => {
    if (editId != null) scrollToFormElement(editFormRef.current);
  }, [editId]);

  const editingUser = users.find((u) => u.id === editId);
  const isSelf = (id: number) => id === currentUser?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ns-muted">
          {pluralizeUsers(users.length)}
        </p>
      </div>

      {editId && editingUser && (
        <div ref={editFormRef} className="aurora-card scroll-mt-4 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4">
            <p className="text-lg sm:text-xl font-semibold text-ns-text">
              Редактировать: {editingUser.name}
            </p>
            <button
              onClick={() => setEditId(null)}
              className="ns-action-icon text-ns-text"
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm leading-none text-ns-text-secondary">
              Статус почты:
            </span>
            <EmailStatusBadge verified={editingUser.isEmailVerified} />
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
              className="ns-btn ns-btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Check size={16} strokeWidth={1.5} />{" "}
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              onClick={() => setEditId(null)}
              className="ns-btn ns-btn-secondary flex items-center justify-center gap-2"
            >
              <X size={16} strokeWidth={1.5} /> Отмена
            </button>
          </div>
        </div>
      )}

      <div className="aurora-card overflow-hidden">
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
                      disabled={isSelf(u.id)}
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
                    <EmailStatusBadge verified={u.isEmailVerified} />
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
                        type="button"
                        onClick={() => openEdit(u)}
                        disabled={isSelf(u.id)}
                        className="ns-action-icon text-ns-text disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={
                          isSelf(u.id) ? "Нельзя редактировать свой профиль" : "Редактировать"
                        }
                      >
                        <Pencil size={16} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete({ open: true, id: u.id, name: u.name });
                        }}
                        disabled={isSelf(u.id)}
                        className="ns-action-icon ns-action-icon--danger text-red-600 dark:text-red-400 disabled:opacity-30"
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
            <div key={u.id} className="p-4 space-y-4">
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
                    type="button"
                    onClick={() => openEdit(u)}
                    disabled={isSelf(u.id)}
                    className="ns-action-icon text-ns-text disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={
                      isSelf(u.id) ? "Нельзя редактировать свой профиль" : "Редактировать"
                    }
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({ open: true, id: u.id, name: u.name });
                    }}
                    disabled={isSelf(u.id)}
                    className="ns-action-icon ns-action-icon--danger text-red-600 dark:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={u.role}
                  disabled={isSelf(u.id)}
                  onChange={(e) =>
                    roleMutation.mutate({ id: u.id, role: e.target.value })
                  }
                  className={roleSelectCls}
                >
                  <option value="USER">Пользователь</option>
                  <option value="ADMIN">Администратор</option>
                </select>
                <EmailStatusBadge verified={u.isEmailVerified} />
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
