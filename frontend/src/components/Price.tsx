import { formatAmount } from "../lib/format";
import { BYNSymbol } from "./BYNSymbol";

type PriceProps = {
  value: number | string;
  className?: string;
  symbolClassName?: string;
};

export function Price({ value, className, symbolClassName }: PriceProps) {
  return (
    <span className={["ns-price", className].filter(Boolean).join(" ")}>
      <span className="ns-price__amount tabular-nums">{formatAmount(value)}</span>
      <BYNSymbol className={["ns-price__symbol", symbolClassName].filter(Boolean).join(" ")} />
    </span>
  );
}
