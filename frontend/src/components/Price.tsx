import { formatAmount } from "../lib/format";

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
      {formatAmount(value)}
      {"\u00A0"}
      ƃ
    </span>
  );
}
