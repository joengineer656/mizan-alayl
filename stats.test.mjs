// Run with: node stats.test.mjs
import assert from 'node:assert';
import { dayKey, calendarKey, addDays, weekStart, hijriMonth, totals, streaks, khatmah, share } from './stats.js';

const at = (y, m, d, h) => new Date(y, m - 1, d, h);
assert.equal(dayKey(at(2026, 11, 9, 2)), '2026-11-08', '2am belongs to the previous night');
assert.equal(dayKey(at(2026, 11, 9, 5)), '2026-11-09', '5am starts the new day');
assert.equal(calendarKey(at(2026, 6, 9, 3)), '2026-06-09', 'summer Fajr keeps its real date');
assert.equal(addDays('2026-12-31', 1), '2027-01-01');

assert.equal(weekStart('2026-11-07'), '2026-11-07', 'Saturday starts its own week');
assert.equal(weekStart('2026-11-13'), '2026-11-07', 'Friday ends the week');
assert.equal(weekStart('2026-11-14'), '2026-11-14');

assert.equal(hijriMonth('2026-11-08'), hijriMonth('2026-11-09'));
assert.notEqual(hijriMonth('2026-11-01'), hijriMonth('2026-11-20'), 'a Hijri month starts inside November');

const L = (date, pages, rakat, fajr, uid = 'a') => ({ uid, date, pages, rakat, fajr });
const logs = [L('2026-11-06', 5, 2, true), L('2026-11-07', 10, 4, false), L('2026-11-08', 20, 0, true), L('2026-11-09', 1, 0, true), L('2026-11-08', 99, 9, true, 'b')];
const ctx = { day: '2026-11-08', fajrDay: '2026-11-09' };
assert.deepEqual(totals(logs, 'a', 'day', ctx), { pages: 20, rakat: 0, fajr: 1 }, 'day uses separate Fajr date');
assert.deepEqual(totals(logs, 'a', 'week', ctx), { pages: 31, rakat: 4, fajr: 2 }, 'Friday the 6th is the previous week');
assert.deepEqual(totals(logs, 'a', 'all', ctx), { pages: 36, rakat: 6, fajr: 3 });
assert.deepEqual(totals(logs, undefined, 'all', ctx), { pages: 0, rakat: 0, fajr: 0 }, 'friend not started yet');

assert.deepEqual(streaks(logs, 'a', 'pages', ctx), { current: 3, longest: 4 });
assert.deepEqual(streaks(logs, 'a', 'rakat', ctx), { current: 2, longest: 2 }, 'today empty does not break it');
assert.deepEqual(streaks(logs, 'a', 'fajr', ctx), { current: 2, longest: 2 }, 'false days break Fajr');

assert.deepEqual(khatmah([L('2026-01-01', 604, 0, false), L('2026-01-02', 604, 0, false), L('2026-01-03', 151, 0, false)], 'a'), { done: 2, pages: 151, pct: 25 });
assert.equal(share(0, 0), 0.5);
assert.equal(share(3, 1), 0.75);
console.log('stats ok');
