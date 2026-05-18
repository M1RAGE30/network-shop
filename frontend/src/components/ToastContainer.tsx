import { useToastStore } from "../store/toastStore";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const STYLES = {
  success:
    "aurora-card text-ns-text",
  error:
    "aurora-card text-ns-text",
  info: "aurora-card text-ns-text",
};

const ICON_WRAP = {
  success: "text-ns-success",
  error: "text-ns-error",
  info: "text-ns-text",
};

const ICONS = {
  success: <CheckCircle size={18} strokeWidth={1.75} />,
  error: <AlertCircle size={18} strokeWidth={1.75} />,
  info: <Info size={18} strokeWidth={1.75} />,
};

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:top-6 sm:right-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-2xl px-4 py-3 min-w-[min(100vw-2rem,18rem)] max-w-sm pointer-events-auto animate-slide-in ${STYLES[toast.type]}`}
        >
          <span className={`shrink-0 mt-0.5 ${ICON_WRAP[toast.type]}`}>
            {ICONS[toast.type]}
          </span>
          <span className="text-sm font-medium leading-snug flex-1 pt-0.5">
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => remove(toast.id)}
            className="shrink-0 p-1 rounded-full text-ns-muted hover:bg-ns-hover transition-colors"
            aria-label="Закрыть"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      ))}
    </div>
  );
}
