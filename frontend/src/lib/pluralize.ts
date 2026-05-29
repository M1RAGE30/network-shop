export function pluralize(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
}

export function pluralizeProducts(count: number): string {
  return `${count} ${pluralize(count, "товар", "товара", "товаров")}`;
}

export function productCountLabel(count: number): string {
  return pluralize(count, "товар", "товара", "товаров");
}

export function pluralizeUsers(count: number): string {
  return `${count} ${pluralize(count, "пользователь", "пользователя", "пользователей")}`;
}

export function pluralizeOrders(count: number): string {
  return `${count} ${pluralize(count, "заказ", "заказа", "заказов")}`;
}

export function pluralizeReviews(count: number): string {
  return `${count} ${pluralize(count, "отзыв", "отзыва", "отзывов")}`;
}

export function pluralizeDialogs(count: number): string {
  return `${count} ${pluralize(count, "диалог", "диалога", "диалогов")}`;
}
