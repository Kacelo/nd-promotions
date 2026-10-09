const TZ = 'Africa/Windhoek';

export function formatEventDate(isoDate: string, style: 'short' | 'long' = 'short') {
  // event_date is a plain date; anchor at noon UTC so it never shifts a day.
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (style === 'long') {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase(),
    day: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase(),
  };
}

export function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : '';
}

export function formatRegistered(ts: string) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ,
  });
}

export function formatMoney(amount: number, currency: string) {
  const n = Number(amount);
  return `${currency}${Number.isInteger(n) ? n : n.toFixed(2)}`;
}
