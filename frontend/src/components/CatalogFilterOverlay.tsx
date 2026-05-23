import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type CatalogFilterOverlayProps = {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  children: React.ReactNode;
};

export default function CatalogFilterOverlay({
  open,
  onClose,
  onApply,
  onReset,
  children,
}: CatalogFilterOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  const header = (
    <div className="flex shrink-0 items-center justify-between border-b border-ns-border px-5 py-4">
      <span className="text-base font-semibold text-ns-text">Фильтры</span>
      <button
        type="button"
        onClick={onClose}
        className="ns-icon-btn ns-touch-target flex items-center justify-center rounded-[12px]"
        aria-label="Закрыть"
      >
        <X size={22} strokeWidth={1.5} />
      </button>
    </div>
  );

  const footer = (
    <div className="flex shrink-0 gap-2 border-t border-ns-border bg-ns-bg-secondary p-4">
      <button type="button" onClick={onReset} className="ns-btn ns-btn-secondary flex-1">
        Сбросить
      </button>
      <button type="button" onClick={onApply} className="ns-btn ns-btn-primary flex-1">
        Применить
      </button>
    </div>
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[200] flex flex-col justify-end md:hidden">
        <button
          type="button"
          className={`ns-overlay-backdrop absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
          aria-label="Закрыть фильтры"
        />
        <div
          className={`ns-catalog-filter-sheet relative flex max-h-[min(92dvh,720px)] flex-col rounded-t-[20px] border-t border-ns-border bg-ns-bg-secondary ${
            visible ? "ns-catalog-filter-sheet--open" : ""
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Фильтры каталога"
        >
          {header}
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {children}
          </div>
          {footer}
        </div>
      </div>

      <div className="fixed inset-0 z-[200] hidden md:block lg:hidden">
        <button
          type="button"
          className={`ns-overlay-backdrop absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
          aria-label="Закрыть фильтры"
        />
        <aside
          className={`ns-catalog-filter-drawer absolute right-0 top-0 flex h-full w-[min(100%,22rem)] flex-col border-l border-ns-border bg-ns-bg-secondary ${
            visible ? "ns-catalog-filter-drawer--open" : ""
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Фильтры каталога"
        >
          {header}
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {children}
          </div>
          {footer}
        </aside>
      </div>
    </>,
    document.body,
  );
}
