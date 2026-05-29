import { Link } from "react-router-dom";
import { Network, Wifi } from "lucide-react";

type Props = {
  onNavigate?: () => void;
  className?: string;
};

export default function BuilderNavMenu({ onNavigate, className = "" }: Props) {
  const itemCls =
    "flex gap-3 rounded-[14px] px-3 py-3 hover:bg-ns-hover transition-colors";

  return (
    <div className={className}>
      <Link
        to="/builder/network"
        onClick={onNavigate}
        className={itemCls}
      >
        <Network size={20} className="text-ns-muted shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>
          <span className="block text-sm font-medium text-ns-text">Конструктор сети</span>
          <span className="block text-xs text-ns-muted">Топология и подбор оборудования</span>
        </span>
      </Link>
      <Link
        to="/builder/wifi"
        onClick={onNavigate}
        className={itemCls}
      >
        <Wifi size={20} className="text-ns-muted shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>
          <span className="block text-sm font-medium text-ns-text">Конструктор Wi‑Fi</span>
          <span className="block text-xs text-ns-muted">Тепловая карта покрытия</span>
        </span>
      </Link>
    </div>
  );
}
