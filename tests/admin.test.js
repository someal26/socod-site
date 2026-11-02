// Run: bun test   (database checks: bash tests/db/run.sh)
import { describe, test, expect } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, pct, shares, niceMax, barGeometry, shortDay, relTime, normalizeOverview, friendlyError } from '../admin/view.js';
import { createAdminClient, decodeJwt } from '../admin/supa.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ---------- helpers ----------
describe('view helpers', () => {
  test('fmt and pct', () => {
    expect(fmt(12345)).toBe('12,345');
    expect(fmt(null)).toBe('–');
    expect(fmt('x')).toBe('–');
    expect(pct(1, 3)).toBe(33);
    expect(pct(5, 0)).toBe(0);
  });
  test('shares always add up to 100 and keep order', () => {
    const s = shares({ so: 1, en: 1, ar: 1 }, ['so', 'en', 'ar']);
    expect(s.map((x) => x.key)).toEqual(['so', 'en', 'ar']);
    expect(s.reduce((a, x) => a + x.pct, 0)).toBe(100);
    expect(shares({}, ['a', 'b']).every((x) => x.pct === 0)).toBe(true);
  });
  test('niceMax picks a clean axis top', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(3)).toBe(5);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(130)).toBe(200);
  });
  test('bars are drawn to scale and stay inside the chart', () => {
    const rows = [{ day: '2026-10-29', active_users: 0 }, { day: '2026-10-30', active_users: 2 }, { day: '2026-10-31', active_users: 5 }];
    const g = barGeometry(rows, { width: 300, height: 150 });
    expect(g.max).toBe(5);
    expect(g.bars[0].h).toBe(0);
    expect(g.bars[2].y).toBeCloseTo(g.plotTop, 5);
    expect(g.bars[1].h * 2.5).toBeCloseTo(g.bars[2].h, 5);
    g.bars.forEach((b) => { expect(b.x).toBeGreaterThanOrEqual(g.left); expect(b.x + b.w).toBeLessThanOrEqual(300 + 0.001); expect(b.y + b.h).toBeCloseTo(g.baseline, 5); });
  });
  test('dates and times read plainly', () => {
    expect(shortDay('2026-10-31')).toBe('Oct 31');
    expect(shortDay('nonsense')).toBe('');
    const now = Date.parse('2026-10-31T12:00:00Z');
    expect(relTime('2026-10-31T11:58:00Z', now)).toBe('2 min ago');
    expect(relTime('2026-10-30T11:00:00Z', now)).toBe('yesterday');
  });
  test('normalizeOverview survives bad or missing data', () => {
    const o = normalizeOverview({ users: { total: '7', anonymous: 'x' }, active: null });
    expect(o.users.total).toBe(7);
    expect(o.users.anonymous).toBe(0);
    expect(o.active.d7).toBe(0);
    expect(normalizeOverview(null).feedback.total).toBe(0);
  });
  test('errors are explained in plain words and never echo server text', () => {
    expect(friendlyError({ message: 'not allowed', code: '42501' })).toMatch(/admin list/);
    expect(friendlyError({ message: 'Invalid login credentials', status: 400 })).toMatch(/email and password/);
    expect(friendlyError({ message: 'Could not find the function public.socod_admin_overview', status: 404 })).toMatch(/not switched on/);
    expect(friendlyError({ message: '<img src=x onerror=alert(1)>' })).not.toMatch(/img/);
  });
});

// ---------- client against a fake server ----------
function jwt(claims) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'none' })}.${b(claims)}.sig`;
}
function fakeServer(routes) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, ...init });
    const path = url.replace('https://x.supabase.co', '');
    const key = `${init.method || 'GET'} ${path.split('?')[0]}`;
    const h = routes[key];
    if (!h) return new Response(JSON.stringify({ message: 'no route ' + key }), { status: 404 });
    const [status, body] = h(init);
    return new Response(body === null ? null : JSON.stringify(body), { status });
  };
  return { calls, fetchImpl };
}
function memStore() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m }; }
const KEY = 'sb_publishable_test';

describe('admin client', () => {
  test('sign in keeps the session in the given (tab) storage, then rpc sends the user token', async () => {
    const aal1 = jwt({ sub: 'u1', aal: 'aal1' });
    const s = fakeServer({
      'POST /auth/v1/token': () => [200, { access_token: aal1, refresh_token: 'r1', expires_in: 3600 }],
      'POST /rest/v1/rpc/socod_admin_overview': () => [200, { users: { total: 1 } }],
    });
    const store = memStore();
    const c = createAdminClient({ url: 'https://x.supabase.co', key: KEY, fetchImpl: s.fetchImpl, storage: store });
    await c.signIn('a@b.c', 'password1');
    expect(c.signedIn).toBe(true);
    expect(store.m.size).toBe(1);
    await c.rpc('socod_admin_overview');
    const last = s.calls.at(-1);
    expect(last.headers.apikey).toBe(KEY);
    expect(last.headers.Authorization).toBe(`Bearer ${aal1}`);
    expect(s.calls[0].headers.Authorization).toBeUndefined();
  });
  test('rpc without a session fails before any network call', async () => {
    const s = fakeServer({});
    const c = createAdminClient({ url: 'https://x.supabase.co', key: KEY, fetchImpl: s.fetchImpl, storage: memStore() });
    await expect(c.rpc('socod_admin_overview')).rejects.toMatchObject({ status: 401 });
    expect(s.calls.length).toBe(0);
  });
  test('code step: verify when an authenticator exists, enroll when not, done at aal2', async () => {
    const store = memStore();
    let factors = [{ id: 'f1', factor_type: 'totp', status: 'verified' }];
    const s = fakeServer({
      'POST /auth/v1/token': () => [200, { access_token: jwt({ sub: 'u1', aal: 'aal1' }), refresh_token: 'r', expires_in: 3600 }],
      'GET /auth/v1/user': () => [200, { factors }],
      'DELETE /auth/v1/factors/f9': () => [200, {}],
      'POST /auth/v1/factors': () => [200, { id: 'f2', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABC' } }],
      'POST /auth/v1/factors/f1/challenge': () => [200, { id: 'ch1' }],
      'POST /auth/v1/factors/f1/verify': (init) => { expect(JSON.parse(init.body)).toEqual({ challenge_id: 'ch1', code: '123456' }); return [200, { access_token: jwt({ sub: 'u1', aal: 'aal2' }), refresh_token: 'r2', expires_in: 3600 }]; },
    });
    const c = createAdminClient({ url: 'https://x.supabase.co', key: KEY, fetchImpl: s.fetchImpl, storage: store });
    await c.signIn('a@b.c', 'password1');
    expect(await c.codeStep()).toEqual({ step: 'verify', factorId: 'f1' });
    factors = [{ id: 'f9', factor_type: 'totp', status: 'unverified' }];
    expect(await c.codeStep()).toEqual({ step: 'enroll' });
    expect(s.calls.some((x) => x.method === 'DELETE' && x.url.endsWith('/factors/f9'))).toBe(true);
    expect((await c.enroll()).secret).toBe('ABC');
    await c.verify('f1', '123456');
    expect(c.claims().aal).toBe('aal2');
    expect(await c.codeStep()).toEqual({ step: 'done' });
  });
  test('expired token is refreshed; failed refresh signs out', async () => {
    let t = 0;
    const store = memStore();
    const s = fakeServer({
      'POST /auth/v1/token': (init) => (JSON.parse(init.body).refresh_token === 'bad' ? [400, { msg: 'bad' }] : [200, { access_token: jwt({ n: ++t }), refresh_token: 'bad', expires_in: 1 }]),
      'POST /rest/v1/rpc/f': () => [200, []],
    });
    const c = createAdminClient({ url: 'https://x.supabase.co', key: KEY, fetchImpl: s.fetchImpl, storage: store });
    await c.signIn('a@b.c', 'password1');
    await expect(c.rpc('f')).rejects.toMatchObject({ status: 401 });
    expect(c.signedIn).toBe(false);
    expect(store.m.size).toBe(0);
  });
  test('sign out clears storage and tells the server', async () => {
    const store = memStore();
    const s = fakeServer({
      'POST /auth/v1/token': () => [200, { access_token: jwt({}), refresh_token: 'r', expires_in: 3600 }],
      'POST /auth/v1/logout': () => [204, null],
    });
    const c = createAdminClient({ url: 'https://x.supabase.co', key: KEY, fetchImpl: s.fetchImpl, storage: store });
    await c.signIn('a@b.c', 'password1');
    await c.signOut();
    expect(c.signedIn).toBe(false);
    expect(store.m.size).toBe(0);
    expect(s.calls.at(-1).url).toMatch(/logout$/);
  });
  test('decodeJwt tolerates junk', () => {
    expect(decodeJwt('nope')).toEqual({});
    expect(decodeJwt(jwt({ aal: 'aal2' })).aal).toBe('aal2');
  });
});

// ---------- static security checks ----------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

describe('the public site reveals nothing without admin sign-in', () => {
  const html = read('admin/index.html');
  const js = ['admin/app.js', 'admin/supa.js', 'admin/view.js', 'admin/config.js'].map(read).join('\n');

  test('strict content security policy, no indexing, no referrer', () => {
    expect(html).toMatch(/Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self';/);
    expect(html).toMatch(/connect-src https:\/\/bckhcixpwnrxzldynfuu\.supabase\.co;/);
    expect(html).toMatch(/name="robots" content="noindex/);
    expect(html).toMatch(/name="referrer" content="no-referrer"/);
  });
  test('no inline scripts, inline styles or inline event handlers', () => {
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/\sstyle=/);
    expect(html).not.toMatch(/\son[a-z]+=/i);
  });
  test('the dashboard area is empty until the server answers', () => {
    const dash = html.slice(html.indexOf('id="v-dash"'), html.indexOf('</main>'));
    expect(dash).toMatch(/<div id="tiles" class="tiles"><\/div>/);
    expect(dash).toMatch(/<div id="panels" class="panels"><\/div>/);
    expect(html).toMatch(/id="v-dash" hidden/);
  });
  test('admin code never writes HTML strings or evaluates code', () => {
    expect(js).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/);
  });
  test('only the publishable key is in the browser, and no secret anywhere in the repo', () => {
    expect(read('admin/config.js')).toMatch(/sb_publishable_/);
    const bad = /sb_secret_|service_role"|SUPABASE_SERVICE|-----BEGIN [A-Z ]*PRIVATE KEY/;
    const hits = walk(ROOT).filter((p) => !p.endsWith('.png') && !p.endsWith('.webp') && !p.endsWith('.ico') && !p.endsWith('admin.test.js'))
      .filter((p) => bad.test(readFileSync(p, 'utf8')));
    expect(hits).toEqual([]);
    expect(js).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.eyJ/); // no JWT-style keys at all
  });
  test('session lives in sessionStorage (shared github.io origin), never localStorage', () => {
    expect(read('admin/supa.js')).toMatch(/sessionStorage/);
    expect(js).not.toMatch(/localStorage\.(get|set)Item/);
  });
  test('the public pages do not link to the admin page', () => {
    for (const p of ['index.html', 'en/index.html', 'so/index.html', 'ar/index.html']) expect(read(p)).not.toMatch(/admin/i);
  });
});

describe('migration rules', () => {
  const dir = join(ROOT, 'supabase/migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
  const sql = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
  test('is marked as not applied, waiting for the founder', () => {
    expect(sql).toMatch(/STATUS: NOT APPLIED/);
  });
  test('every new table turns on row-level security in the same file', () => {
    const tables = [...sql.matchAll(/create table if not exists (public\.\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(0);
    tables.forEach((t) => expect(sql).toContain(`alter table ${t} enable row level security`));
  });
  test('every security definer function pins search_path', () => {
    const fns = sql.split(/create or replace function/).slice(1);
    fns.filter((f) => /security definer/.test(f)).forEach((f) => expect(f).toMatch(/set search_path = ''/));
  });
  test('admin functions are revoked from anon', () => {
    for (const fn of ['socod_admin_whoami()', 'socod_admin_overview()', 'socod_admin_daily(integer)', 'socod_admin_feedback(integer)']) {
      expect(sql).toContain(`revoke all on function public.${fn}`);
    }
  });
  test('nothing drops or deletes existing data', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from|drop column|alter table public\.socod_(profiles|days|progress|groups|group_members|challenges|challenge_members)/i);
  });
});
