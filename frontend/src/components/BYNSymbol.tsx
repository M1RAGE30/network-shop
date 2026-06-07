type BYNSymbolProps = {
  className?: string;
};

export function BYNSymbol({ className }: BYNSymbolProps) {
  return (
    <i
      className={["nbrb-icon", className].filter(Boolean).join(" ")}
      aria-label="белорусский рубль"
      title="белорусский рубль"
    >
      BYN
    </i>
  );
}
