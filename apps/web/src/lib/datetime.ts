/**
 * <input type="datetime-local"> works in the viewer's local time without a zone. These
 * helpers convert between that value and the UTC ISO strings the API stores.
 */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string {
  return value ? new Date(value).toISOString() : '';
}
