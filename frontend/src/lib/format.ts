const formatter = new Intl.NumberFormat("ru-BY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatAmount = (value: number | string): string =>
  formatter.format(Number(value));
