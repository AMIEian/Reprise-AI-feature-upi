export function formatCurrency(
  value: number | string | null | undefined,
  currency = "INR",
  locale = "en-IN",
) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    num,
  );
}

export function formatCredits(value: number | string | null | undefined) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "◇0";
  // Format with Indian locale for number formatting but with coin symbol ◇
  const formatted = new Intl.NumberFormat("en-IN").format(num);
  return `◇${formatted}`;
}

export function formatNumber(
  value: number | string | null | undefined,
  locale = "en-US",
  maximumFractionDigits?: number,
) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(num);
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions,
) {
  if (value === null || value === undefined || value === "") return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const defaultOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };
  return new Intl.DateTimeFormat(locale, options ?? defaultOpts).format(date);
}
