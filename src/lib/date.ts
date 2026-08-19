/**
 * Formats an ISO date/time string (as sent by the backend, e.g. a Job's
 * submitDate) in the browser's own local time zone and locale — the
 * backend/HID Fargo Connect may report it in UTC or a server-side zone, but
 * people reading this table want to see it in their own local time.
 */
export function formatLocalDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
