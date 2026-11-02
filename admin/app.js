// Socod admin: page glue. All text from the server goes in with textContent, never as HTML strings.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, IDLE_MINUTES } from './config.js';
import { createAdminClient } from './supa.js';
import { fmt, pct, shares, barGeometry, shortDay, relTime, normalizeOverview, friendlyError, LANG, KIND } from './view.js';

const sb = createAdminClient({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });
const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const VIEWS = ['v-signin', 'v-enroll', 'v-code', 'v-dash'];
let factorId = null;

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else e.setAttribute(k, v);
  }
  kids.flat(Infinity).forEach((c) => c && e.append(c));
  return e;
}
function svg(tag, attrs = {}) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function show(id) {
  VIEWS.forEach((v) => { $(v).hidden = v !== id; });
  $('signout').hidden = id === 'v-signin';
  const first = $(id).querySelector('input');
  if (first) first.focus();
}
function notice(text, bad = false) {
  const n = $('notice');
  n.textContent = text || '';
  n.className = bad ? 'notice bad' : 'notice';
  n.hidden = !text;
}
async function busy(form, fn) {
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  try { await fn(); } catch (e) { notice(friendlyError(e), true); if (/admin list/.test(friendlyError(e))) await signOut(false); }
  finally { btn.disabled = false; }
}

async function signOut(clearNotice = true) {
  await sb.signOut();
  $('tiles').replaceChildren();
  $('panels').replaceChildren();
  ['password', 'code', 'code-enroll'].forEach((id) => { $(id).value = ''; });
  $('qr').removeAttribute('src');
  $('secret').textContent = '';
  if (clearNotice) notice('');
  show('v-signin');
}

async function nextStep() {
  const s = await sb.codeStep();
  if (s.step === 'done') return loadDash();
  if (s.step === 'verify') { factorId = s.factorId; return show('v-code'); }
  const e = await sb.enroll();
  factorId = e.factorId;
  if (e.qr && /^data:image\/svg\+xml/.test(e.qr)) $('qr').src = e.qr;
  $('secret').textContent = e.secret || '';
  show('v-enroll');
}

// Dashboard -------------------------------------------------------------------------------------
function tile(label, value, sub) {
  return el('div', { class: 'tile' }, el('div', { class: 'k', text: label }), el('div', { class: 'v', text: value }), el('div', { class: 's', text: sub }));
}

function dailyChart(rows) {
  const g = barGeometry(rows, { width: 340, height: 150 });
  const root = svg('svg', { viewBox: `0 0 ${g.width} ${g.height}`, class: 'chart', role: 'img', 'aria-label': `Active users per day, last ${rows.length} days` });
  g.ticks.forEach((t) => {
    root.append(svg('line', { x1: g.left, x2: g.width, y1: t.y, y2: t.y, class: 'grid' }));
    const lab = svg('text', { x: g.left - 6, y: t.y + 4, 'text-anchor': 'end' });
    lab.textContent = fmt(Math.round(t.value * 10) / 10);
    root.append(lab);
  });
  const tip = el('p', { class: 'tip', 'aria-live': 'polite', text: 'Tap a bar to see the day.' });
  g.bars.forEach((b) => {
    const label = `${shortDay(b.day)}: ${fmt(b.value)} active`;
    const hit = svg('rect', { x: b.slotX, y: g.plotTop, width: b.slotW, height: g.baseline - g.plotTop, class: 'hit', tabindex: 0 });
    const t = svg('title'); t.textContent = label; hit.append(t);
    const say = () => { tip.textContent = label; };
    hit.addEventListener('mouseenter', say); hit.addEventListener('focus', say); hit.addEventListener('click', say);
    root.append(hit);
    root.append(svg('rect', { x: b.x, y: b.y, width: b.w, height: Math.max(b.h, 0), rx: b.h > 4 ? 2 : 0, class: 'bar' }));
  });
  const first = rows[0], last = rows[rows.length - 1];
  [[first, g.left, 'start'], [last, g.width, 'end']].forEach(([r, x, a]) => {
    if (!r) return;
    const lab = svg('text', { x, y: g.height - 4, 'text-anchor': a }); lab.textContent = shortDay(r.day); root.append(lab);
  });
  return [root, tip];
}

function split(title, obj, order, labels) {
  const parts = shares(obj, order);
  const bar = el('div', { class: 'split', role: 'img', 'aria-label': parts.map((p) => `${labels[p.key]} ${p.pct}%`).join(', ') },
    parts.filter((p) => p.value > 0).map((p) => { const s = el('span', { class: `f${order.indexOf(p.key) + 1}` }); s.style.flexGrow = String(p.value); return s; }));
  const legend = el('ul', { class: 'legend' }, parts.map((p) => el('li', {}, el('i', { class: `f${order.indexOf(p.key) + 1}` }), el('span', { text: labels[p.key] }), el('b', { text: `${fmt(p.value)} · ${p.pct}%` }))));
  return el('div', { class: 'card' }, el('h2', { text: title }), bar, legend);
}

function facts(title, pairs, extra) {
  const dl = el('dl', { class: 'facts' }, pairs.map(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]));
  return el('div', { class: 'card' }, el('h2', { text: title }), dl, extra || null);
}

function feedbackCard(items) {
  const list = items.length
    ? el('ul', { class: 'fb' }, items.map((f) => el('li', {},
        el('div', { class: 'meta' }, el('span', { class: 'chip', text: KIND[f.kind] || 'Other' }), `${relTime(f.created_at)} · ${LANG[f.lang] || '–'} · v${f.app_version || '?'}`),
        el('p', { text: f.message }))))
    : el('p', { class: 'empty', text: 'No feedback yet. The in-app "Send feedback" button arrives with version 1.1.' });
  return el('div', { class: 'card wide' }, el('h2', { text: 'Latest feedback' }), list);
}

async function loadDash() {
  const [raw, daily, fb] = await Promise.all([
    sb.rpc('socod_admin_overview'),
    sb.rpc('socod_admin_daily', { p_days: 30 }),
    sb.rpc('socod_admin_feedback', { p_limit: 30 }),
  ]);
  const o = normalizeOverview(raw);
  const rows = Array.isArray(daily) ? daily : [];
  notice('');
  $('updated').textContent = o.generatedAt ? `Updated ${new Date(o.generatedAt).toLocaleString()}` : '';
  $('tiles').replaceChildren(
    tile('People', fmt(o.users.total), `${fmt(o.users.new7)} new this week`),
    tile('Active, 7 days', fmt(o.active.d7), `${pct(o.active.d7, o.users.total)}% of all · ${fmt(o.active.today)} today`),
    tile('Unlocks, 30 days', fmt(o.unlocks.walk + o.unlocks.promise), `${pct(o.unlocks.walk, o.unlocks.walk + o.unlocks.promise)}% by walk or workout`),
    tile('Feedback', fmt(o.feedback.total), `${fmt(o.feedback.new7)} this week`),
  );
  const dailyCard = el('div', { class: 'card wide' }, el('h2', { text: 'Active people per day · last 30 days' }), ...dailyChart(rows));
  const sales = el('p', { class: 'small muted' }, 'Premium and tips are paid through Apple, so they are not in this database. See App Store Connect, Sales and Trends.');
  $('panels').replaceChildren(
    dailyCard,
    split('App language', o.languages, ['so', 'en', 'ar'], LANG),
    split('How people unlock (30 days)', { walk: o.unlocks.walk, promise: o.unlocks.promise }, ['walk', 'promise'], { walk: 'Walk or workout', promise: 'Promise' }),
    facts('Movement (30 days)', [['Steps counted', fmt(o.unlocks.steps)], ['Workout minutes', fmt(o.unlocks.workoutMin)], ['Walk mode', fmt(o.modes.walk)], ['Workout mode', fmt(o.modes.workout)]]),
    facts('Community and money', [['Groups', fmt(o.community.groups)], ['Group members', fmt(o.community.members)], ['Challenge sign-ups', fmt(o.community.challenges)], ['New people, 30 days', fmt(o.users.new30)]], sales),
    feedbackCard(Array.isArray(fb) ? fb : []),
  );
  show('v-dash');
}

// Idle sign-out --------------------------------------------------------------------------------
let idleTimer;
function resetIdle() {
  clearTimeout(idleTimer);
  if (!sb.signedIn) return;
  idleTimer = setTimeout(async () => { await signOut(); notice('Signed out after 15 minutes without activity.'); }, IDLE_MINUTES * 60000);
}
['pointerdown', 'keydown', 'visibilitychange'].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));

// Wire up --------------------------------------------------------------------------------------
const digits = (v) => String(v || '').replace(/\D/g, '').slice(0, 6);

$('f-signin').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const email = $('email').value.trim();
  const password = $('password').value;
  if (!email || password.length < 8) { notice('Enter your admin email and password.', true); return; }
  busy(ev.target, async () => { await sb.signIn(email, password); $('password').value = ''; notice(''); resetIdle(); await nextStep(); });
});
$('f-enroll').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const code = digits($('code-enroll').value);
  if (code.length !== 6) { notice('Type the 6 digits from your authenticator app.', true); return; }
  busy(ev.target, async () => { await sb.verify(factorId, code); $('secret').textContent = ''; $('qr').removeAttribute('src'); await loadDash(); });
});
$('f-code').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const code = digits($('code').value);
  if (code.length !== 6) { notice('Type the 6 digits from your authenticator app.', true); return; }
  busy(ev.target, async () => { await sb.verify(factorId, code); $('code').value = ''; await loadDash(); });
});
$('signout').addEventListener('click', () => signOut());
$('refresh').addEventListener('click', async (ev) => {
  ev.target.disabled = true;
  try { await loadDash(); } catch (e) { notice(friendlyError(e), true); } finally { ev.target.disabled = false; }
});

// Returning in the same tab: resume where the sign-in left off.
(async () => {
  if (!sb.signedIn) return show('v-signin');
  try { resetIdle(); await nextStep(); } catch (e) { notice(friendlyError(e), true); await signOut(false); }
})();
