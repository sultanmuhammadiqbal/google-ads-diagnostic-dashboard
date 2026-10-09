export function sumRows(rows) {
  const t = { cost: 0, clicks: 0, impressions: 0, allConv: 0, purchase: 0, store_visit: 0, directions: 0, add_to_cart: 0, begin_checkout: 0 };
  for (const r of rows) {
    for (const k in t) t[k] += r[k];
  }
  return t;
}

export const ratio = (a, b) => (b > 0 ? a / b : null);

// Acuan indeks: rata-rata harian pada hari-hari awal periode = 100.
export function baseline(rows, days) {
  const t = sumRows(rows.filter((r) => r.day < days));
  return { cost: t.cost / days, conv: t.allConv / days, cpa: ratio(t.cost, t.allConv) };
}

export function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

export function dayIso(startDate, day) {
  const [y, mo, d] = startDate.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d + day)).toISOString().slice(0, 10);
}

export function isoToDay(startDate, iso) {
  const [y, mo, d] = startDate.split('-').map(Number);
  const [y2, mo2, d2] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y2, mo2 - 1, d2) - Date.UTC(y, mo - 1, d)) / 86400000);
}
