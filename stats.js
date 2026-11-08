// Pure date and totals logic. Keys are 'YYYY-MM-DD' in the user's local calendar.
const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const utc = (key) => new Date(`${key}T12:00:00Z`);

// Quran and Qiyam after midnight count for the night before, until 5:00 am.
export const dayKey = (now) => toKey(new Date(now.getTime() - 5 * 3600e3));
// Fajr always counts on its real date, because in summer it comes before 5:00 am.
export const calendarKey = (now) => toKey(now);

export const addDays = (key, n) => {
  const d = utc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const dayNumber = (key) => Math.round(utc(key).getTime() / 864e5);
export const weekStart = (key) => addDays(key, -((utc(key).getUTCDay() + 1) % 7)); // Saturday

const hijriParts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const hijriMonth = (key) => hijriParts.formatToParts(utc(key)).filter((p) => p.type === 'month' || p.type === 'year').map((p) => p.value).join('-');

const n = (v) => Number(v) || 0;
const inRange = (period, key, day) => {
  if (period === 'week') { const s = weekStart(day); return key >= s && key <= addDays(s, 6); }
  if (period === 'month') return hijriMonth(key) === hijriMonth(day);
  return true;
};

export function totals(logs, uid, period, ctx) {
  const own = logs.filter((l) => l.uid === uid);
  const t = { pages: 0, rakat: 0, fajr: 0 };
  for (const l of own) {
    if (period === 'day' ? l.date === ctx.day : inRange(period, l.date, ctx.day)) { t.pages += n(l.pages); t.rakat += n(l.rakat); }
    if (period === 'day' ? l.date === ctx.fajrDay : inRange(period, l.date, ctx.day)) t.fajr += l.fajr ? 1 : 0;
  }
  return t;
}

export function streaks(logs, uid, key, ctx) {
  const dates = [...new Set(logs.filter((l) => l.uid === uid && n(l[key])).map((l) => l.date))].sort();
  const set = new Set(dates);
  const today = key === 'fajr' ? ctx.fajrDay : ctx.day;
  // Today not logged yet must not break the streak.
  let d = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(d)) { current++; d = addDays(d, -1); }
  let longest = 0, run = 0, prev = null;
  for (const x of dates) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = x;
  }
  return { current, longest };
}

export function khatmah(logs, uid) {
  const all = logs.filter((l) => l.uid === uid).reduce((s, l) => s + n(l.pages), 0);
  return { done: Math.floor(all / 604), pages: all % 604, pct: ((all % 604) / 604) * 100 };
}

export const share = (a, b) => (a + b ? a / (a + b) : 0.5);
