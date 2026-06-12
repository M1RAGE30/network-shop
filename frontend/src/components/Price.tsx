import { formatAmount } from "../lib/format";
import { BYNSymbol } from "./BYNSymbol";

type PriceProps = {
  value: number | string;
  className?: string;
  inline?: boolean;
};

export function Price({ value, className, inline = false }: PriceProps) {
  return (
    <span
      className={["ns-price", inline && "ns-price--inline", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="ns-price__amount tabular-nums">{formatAmount(value)}</span>
      <BYNSymbol className="ns-price__symbol" />
    </span>
  );
}
