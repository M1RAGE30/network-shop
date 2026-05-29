const formatter = new Intl.NumberFormat("ru-BY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPrice = (value: number | string): string =>
  `${formatter.format(Number(value))} BYN`;
