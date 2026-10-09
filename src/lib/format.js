const dec1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const int = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const fmtIndex = (v) => (v == null ? '–' : dec1.format(v));
export const fmtInt = (v) => int.format(v);
export const fmtPct = (v) => `${dec1.format(v)}%`;
export const fmtRatio = (v) => `${dec1.format(v)}×`;
export const fmtDate = (iso) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
export const fmtDateShort = (iso) => dateShort.format(new Date(`${iso}T00:00:00Z`));
