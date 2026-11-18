export const pounds = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export const ukDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" })
    .format(new Date(`${value}T12:00:00Z`));

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

export function fromForm(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
