// Socod admin: pure helpers (no DOM, no network) so they can be tested.

export const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function fmt(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '–';
  return Number(v).toLocaleString('en-US');
}

export function pct(part, total) {
  return n(total) > 0 ? Math.round((n(part) / n(total)) * 100) : 0;
}

// Percent shares that always add up to 100 (largest remainder), in the given order.
export function shares(obj, order) {
  const vals = order.map((k) => ({ key: k, value: n(obj && obj[k]) }));
  const total = vals.reduce((s, x) => s + x.value, 0);
  if (!total) return vals.map((x) => ({ ...x, pct: 0 }));
  const raw = vals.map((x) => ({ ...x, exact: (x.value / total) * 100 }));
  raw.forEach((x) => { x.pct = Math.floor(x.exact); });
  let left = 100 - raw.reduce((s, x) => s + x.pct, 0);
  [...raw].sort((a, b) => (b.exact - b.pct) - (a.exact - a.pct)).forEach((x) => { if (left > 0) { x.pct += 1; left -= 1; } });
  return raw.map(({ key, value, pct: p }) => ({ key, value, pct: p }));
}

// Smallest 1/2/5 x 10^k at or above v (at least 1), for a clean axis top.
export function niceMax(v) {
  const x = Math.max(1, n(v));
  const p = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 5, 10]) if (m * p >= x) return m * p;
  return 10 * p;
}

// Bar geometry for the daily chart. Bars grow from the baseline; empty days get no bar.
export function barGeometry(rows, { width = 340, height = 150, left = 28, bottom = 22, top = 8, field = 'active_users' } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const max = niceMax(Math.max(0, ...list.map((r) => n(r[field]))));
  const plotW = width - left;
  const plotH = height - top - bottom;
  const slot = list.length ? plotW / list.length : plotW;
  const gap = Math.min(2, slot * 0.25);
  const bars = list.map((r, i) => {
    const v = n(r[field]);
    const h = (v / max) * plotH;
    return { x: left + i * slot + gap / 2, y: top + plotH - h, w: Math.max(1, slot - gap), h, value: v, day: r.day, slotX: left + i * slot, slotW: slot };
  });
  const ticks = [0, max / 2, max].map((t) => ({ value: t, y: top + plotH - (t / max) * plotH }));
  return { bars, ticks, max, baseline: top + plotH, plotTop: top, left, width, height };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : '';
}

export function relTime(iso, nowMs = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((nowMs - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export const LANG = { so: 'Somali', en: 'English', ar: 'Arabic' };
export const KIND = { idea: 'Idea', problem: 'Problem', praise: 'Praise', other: 'Other' };

// Coerce whatever the server returned into the exact shape the page draws.
export function normalizeOverview(o) {
  const g = (path) => path.reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
  return {
    generatedAt: typeof g(['generated_at']) === 'string' ? g(['generated_at']) : null,
    users: { total: n(g(['users', 'total'])), anonymous: n(g(['users', 'anonymous'])), new7: n(g(['users', 'new_7d'])), new30: n(g(['users', 'new_30d'])) },
    active: { today: n(g(['active', 'today'])), d7: n(g(['active', 'd7'])), d30: n(g(['active', 'd30'])) },
    unlocks: { walk: n(g(['unlocks_30d', 'walk_or_workout'])), promise: n(g(['unlocks_30d', 'promise'])), steps: n(g(['unlocks_30d', 'steps'])), workoutMin: n(g(['unlocks_30d', 'workout_minutes'])) },
    languages: { so: n(g(['languages', 'so'])), en: n(g(['languages', 'en'])), ar: n(g(['languages', 'ar'])) },
    modes: { walk: n(g(['modes', 'walk'])), workout: n(g(['modes', 'workout'])) },
    community: { groups: n(g(['community', 'groups'])), members: n(g(['community', 'group_members'])), challenges: n(g(['community', 'challenge_sign_ups'])) },
    feedback: { total: n(g(['feedback', 'total'])), new7: n(g(['feedback', 'new_7d'])) },
  };
}

// Plain-words message for anything that goes wrong. Never echoes server text back into the page.
export function friendlyError(err) {
  const status = err && err.status;
  const msg = String((err && err.message) || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid_credentials')) return 'That email and password do not match. Check both and try again.';
  if (msg.includes('invalid totp') || msg.includes('invalid code') || msg.includes('mfa_verification_failed')) return 'That 6-digit code did not work. Codes change every 30 seconds; enter the newest one.';
  if (status === 429 || msg.includes('rate limit')) return 'Too many tries. Wait a minute, then try again.';
  if (msg.includes('not allowed') || (err && err.code === '42501') || status === 403) return 'This account is not on the Socod admin list. Signed out for safety.';
  if (msg.includes('could not find the function') || status === 404) return 'The dashboard is not switched on yet. The founder must approve and apply the admin database update first.';
  if (msg === 'signed_out' || status === 401) return 'Your sign-in ended. Sign in again.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'No connection to the server. Check the internet and try again.';
  return 'Something went wrong. Try again in a minute.';
}
