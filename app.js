import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { CONTENT } from './content.js';
import { dayKey, calendarKey, addDays, dayNumber, totals, streaks, khatmah, share } from './stats.js';

const $ = (id) => document.getElementById(id);
const num = (n) => Number(n).toLocaleString('ar-EG');
const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const hijriOf = (key) => hijri.format(new Date(`${key}T12:00:00Z`));
const toInt = (s) => parseInt(String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10) || 0;

const STATS = [
  { key: 'pages', name: 'القرآن', ring: 'الحلقة الخارجية', r: 150 },
  { key: 'rakat', name: 'قيام الليل', ring: 'الحلقة الوسطى', r: 121 },
  { key: 'fajr', name: 'الفجر في المسجد', ring: 'الحلقة الداخلية', r: 92 },
];
const LIMIT = { pages: 604, rakat: 99 };

let db, auth, me = null, stop = null;
let logs = [], byId = new Map();
let period = 'day', offset = 0, kind = 'ayat';
const browse = { ayat: 0, hadith: 0, quotes: 0 };

const context = () => { const now = new Date(); return { day: dayKey(now), fajrDay: calendarKey(now) }; };

function buildDial() {
  const AMBER = '#F2B33D', SHARE = '#8B5326';
  const point = (a, r) => `${(180 + r * Math.cos(a)).toFixed(1)}`;
  const pointY = (a, r) => `${(180 + r * Math.sin(a)).toFixed(1)}`;
  const line = (a1, r1, a2, r2) => `<line x1="${point(a1, r1)}" y1="${pointY(a1, r1)}" x2="${point(a2, r2)}" y2="${pointY(a2, r2)}" stroke="${AMBER}" stroke-width="1.5"/>`;
  const ticks = Array.from({ length: 72 }, (_, i) => { const a = (i * 5 * Math.PI) / 180; return line(a, 176, a, i % 6 ? 172 : 164); }).join('');
  const rete = Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return line(a, 40, a + 0.35, 70); }).join('');
  const rings = STATS.map(({ key, r }) => `<circle cx="180" cy="180" r="${r}" fill="none" stroke="${SHARE}" stroke-width="20"/><circle class="ring" data-ring="${key}" cx="180" cy="180" r="${r}" fill="none" stroke="${AMBER}" stroke-width="20" pathLength="100" transform="rotate(-90 180 180)"/>`).join('');
  $('dial').innerHTML = `<svg class="dial" viewBox="0 0 360 360" role="img" aria-label="حصة كل منكما في القرآن والقيام والفجر"><circle cx="180" cy="180" r="178" fill="#1F1009" stroke="${AMBER}" stroke-width="2"/>${ticks}${rings}<g class="rete">${rete}<circle cx="180" cy="180" r="70" fill="none" stroke="${AMBER}" stroke-width="1.5"/></g><circle cx="180" cy="180" r="36" fill="#2A170D" stroke="${AMBER}" stroke-width="2"/><text id="pct" x="180" y="180" text-anchor="middle" font-size="24" font-weight="700" fill="#F6E9D2"></text><text x="180" y="201" text-anchor="middle" font-size="14" fill="#F6E9D2">حصتك</text></svg>`;
}

function renderWords(day) {
  const list = CONTENT[kind];
  const len = list.length;
  const item = list[(((dayNumber(day) + browse[kind]) % len) + len) % len];
  const intro = kind === 'hadith' ? '<p class="intro">قال رسول الله ﷺ:</p>' : '';
  const by = item.by ? `<p class="by">${item.by}</p>` : '';
  $('words').innerHTML = `${intro}<blockquote class="${kind === 'ayat' ? 'ayah' : ''}">${item.text}</blockquote>${by}<figcaption class="ref">${item.ref}</figcaption>`;
}

function render() {
  if (!me) return;
  const ctx = context();
  const friend = logs.find((l) => l.uid !== me)?.uid;
  const you = totals(logs, me, period, ctx), other = totals(logs, friend, period, ctx);

  $('date').textContent = hijriOf(ctx.day);
  let sum = 0;
  document.querySelectorAll('[data-ring]').forEach((c) => {
    const s = share(you[c.dataset.ring], other[c.dataset.ring]);
    sum += s;
    c.setAttribute('stroke-dasharray', `${s * 100} 100`);
  });
  $('pct').textContent = `${num(Math.round((sum / STATS.length) * 100))}٪`;

  const show = (key, v) => (key === 'fajr' && period === 'day' ? (v ? 'نعم' : 'لا') : num(v));
  $('rows').innerHTML = STATS.map(({ key, name, ring }) => {
    const slot = (cls, label, v, rival, uid) => {
      const st = streaks(logs, uid, key, ctx);
      return `<div class="slot ${cls}"><b>${show(key, v)}</b><small>${label}${v > rival ? '، الأعلى' : ''}</small><small>متتالية ${num(st.current)}، الأطول ${num(st.longest)}</small></div>`;
    };
    return `<section class="board"><h2>${name}<span>${ring}</span></h2><div class="slots">${slot('you', 'أنت', you[key], other[key], me)}${slot('friend', 'صديقك', other[key], you[key], friend)}</div></section>`;
  }).join('');

  $('kh').innerHTML = [['أنت', me], ['صديقك', friend]].map(([label, uid]) => {
    const k = khatmah(logs, uid);
    return `<div class="kh">${label}: ${num(k.done)} ختمات<br>الحالية ${num(k.pages)} من ٦٠٤<div class="groove"><i style="width:${k.pct}%"></i></div></div>`;
  }).join('');

  const entryDay = addDays(ctx.day, -offset);
  $('entryDate').textContent = hijriOf(entryDay);
  const log = byId.get(`${me}_${entryDay}`);
  for (const key of ['pages', 'rakat']) if (document.activeElement !== $(key)) $(key).value = num(log?.[key] ?? 0);
  $('fajr').setAttribute('aria-pressed', !!byId.get(`${me}_${addDays(ctx.fajrDay, -offset)}`)?.fajr);

  document.querySelectorAll('[data-period]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.period === period));
  document.querySelectorAll('[data-offset]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.offset === offset));
  document.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.kind === kind));
  renderWords(ctx.day);
}

let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 4000);
}

function save(date, patch) {
  const id = `${me}_${date}`;
  const cur = byId.get(id) ?? { pages: 0, rakat: 0, fajr: false };
  const data = { uid: me, date, pages: cur.pages, rakat: cur.rakat, fajr: cur.fajr, ...patch };
  byId.set(id, data);
  setDoc(doc(db, 'logs', id), data).catch((e) => toast(e.code === 'permission-denied' ? 'يمكن التعديل على اليوم وأمس فقط.' : 'لم يُحفظ التعديل. تحقق من الاتصال وحاول مرة أخرى.'));
}

function setCount(key, value) {
  const v = Math.min(LIMIT[key], Math.max(0, value));
  $(key).value = num(v);
  save(addDays(context().day, -offset), { [key]: v });
}

function gate(mode, uid) {
  $('home').hidden = true;
  $('gate').hidden = false;
  const VIEWS = {
    setup: '<h3>أكمل الإعداد أولًا</h3><p>ضع بيانات مشروع Firebase في ملف firebase-config.js كما في ملف README.</p>',
    signin: '<h3>ابدأ التحدي</h3><p>سجّل الدخول بحساب Google لتسجيل وردك ومقارنته بصديقك.</p><button type="button" class="gate-btn" id="signin">تسجيل الدخول بحساب Google</button>',
    denied: `<h3>هذا الحساب غير مضاف</h3><p>أضف هذا المعرف إلى قواعد Firestore كما في ملف README، ثم أعد فتح الصفحة:</p><p id="uid">${uid}</p><button type="button" class="gate-btn" id="signout2">تسجيل الخروج</button>`,
    error: '<h3>تعذر تحميل البيانات</h3><p>تحقق من الاتصال ثم أعد فتح الصفحة.</p>',
  };
  $('gate').innerHTML = VIEWS[mode];
}

function listen(user) {
  me = user.uid;
  stop = onSnapshot(collection(db, 'logs'), (snap) => {
    logs = snap.docs.map((d) => d.data());
    byId = new Map(snap.docs.map((d) => [d.id, d.data()]));
    $('gate').hidden = true;
    $('home').hidden = false;
    render();
  }, (e) => gate(e.code === 'permission-denied' ? 'denied' : 'error', me));
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'signin') {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (err) { if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') toast('تعذر تسجيل الدخول. تأكد من السماح بالنوافذ المنبثقة وحاول مرة أخرى.'); }
    return;
  }
  if (b.id === 'signout' || b.id === 'signout2') return void signOut(auth);
  if (b.id === 'install') { installPrompt?.prompt(); b.hidden = true; return; }
  if (b.id === 'fajr') {
    const date = addDays(context().fajrDay, -offset);
    return void (save(date, { fajr: b.getAttribute('aria-pressed') !== 'true' }), render());
  }
  if (b.dataset.step) {
    const [key, d] = b.dataset.step.split(',');
    return setCount(key, toInt($(key).value) + +d);
  }
  if (b.dataset.period) period = b.dataset.period;
  else if (b.dataset.offset) offset = +b.dataset.offset;
  else if (b.dataset.kind) kind = b.dataset.kind;
  else if (b.dataset.browse) browse[kind] += +b.dataset.browse;
  else return;
  render();
});

for (const key of ['pages', 'rakat']) $(key).addEventListener('change', (e) => setCount(key, toInt(e.target.value)));

let installPrompt;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; $('install').hidden = false; });
setInterval(render, 60000); // Moves to the new day at 5:00 am if the page stays open.
document.addEventListener('visibilitychange', render);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

$('date').textContent = hijriOf(context().day);
buildDial();
if (firebaseConfig.apiKey.startsWith('PASTE')) gate('setup');
else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  onAuthStateChanged(auth, (user) => {
    stop?.();
    stop = null; me = null; logs = []; byId = new Map();
    if (user) listen(user); else gate('signin');
  });
}
