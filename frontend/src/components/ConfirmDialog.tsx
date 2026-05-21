import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Удалить",
  cancelText = "Отмена",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      const top = document.body.style.top;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, Math.abs(parseInt(top, 10)));
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div className="aurora-card relative w-full max-w-sm rounded-2xl p-6">
        <p className="text-lg font-semibold text-ns-text">
          {title}
        </p>
        <p className="mt-2 text-sm text-ns-muted">
          {message}
        </p>
        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="ns-btn ns-btn-secondary text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`ns-btn text-sm ${confirmVariant === "danger" ? "bg-ns-error hover:opacity-90 text-[var(--ns-danger-fg)]" : "ns-btn-primary"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

