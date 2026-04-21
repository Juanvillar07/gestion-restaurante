const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "$0";
  return currency.format(n);
}

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return dateTime.format(d);
}

const timeOnly = new Intl.DateTimeFormat("es-CO", { timeStyle: "short" });

export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return timeOnly.format(d);
}
