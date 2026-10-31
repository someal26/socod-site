// Socod admin: tiny Supabase client (Auth + MFA + RPC) over fetch. No library, no secrets.
// The browser only ever holds the public project URL and the publishable key. Every number the
// dashboard shows comes from SECURITY DEFINER functions that check the admin allow-list and the
// 6-digit authenticator step on the server, so this file grants nothing by itself.

const SESSION_KEY = 'socod.admin.session';

export function decodeJwt(token) {
  try {
    const part = String(token).split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

export function createAdminClient({ url, key, fetchImpl, storage, now = () => Date.now() }) {
  const f = fetchImpl || ((...a) => fetch(...a));
  // sessionStorage: the sign-in ends when the tab closes. someal26.github.io is shared by every
  // site on that account, so nothing is kept in localStorage.
  const store = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
  let session = null;
  try { session = JSON.parse((store && store.getItem(SESSION_KEY)) || 'null'); } catch { session = null; }

  const save = (s) => {
    session = s;
    try { if (store) { s ? store.setItem(SESSION_KEY, JSON.stringify(s)) : store.removeItem(SESSION_KEY); } } catch {}
  };
  const keep = (d) => save({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: now() + (d.expires_in || 3600) * 1000,
  });

  async function call(path, { method = 'POST', body, auth = false } = {}) {
    const headers = { apikey: key };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const t = await token();
      if (!t) throw Object.assign(new Error('signed_out'), { status: 401 });
      headers.Authorization = `Bearer ${t}`;
    }
    const r = await f(`${url}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
    if (r.status === 204) return null;
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (data && (data.msg || data.error_description || data.message || data.error)) || 'request_failed';
      throw Object.assign(new Error(msg), { status: r.status, code: data && (data.code || data.error_code) });
    }
    return data;
  }

  async function token() {
    if (!session) return null;
    if (now() > session.expires_at - 60000) {
      try { keep(await call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: session.refresh_token } })); }
      catch { save(null); return null; }
    }
    return session.access_token;
  }

  return {
    get signedIn() { return !!session; },
    claims() { return session ? decodeJwt(session.access_token) : {}; },
    async signIn(email, password) {
      keep(await call('/auth/v1/token?grant_type=password', { body: { email, password } }));
    },
    // What the authenticator step needs: 'done' (aal2), 'verify' (has an authenticator) or 'enroll'.
    async codeStep() {
      const c = this.claims();
      if (c.aal === 'aal2') return { step: 'done' };
      const user = await call('/auth/v1/user', { method: 'GET', auth: true });
      const factors = (user && user.factors) || [];
      const ready = factors.find((x) => x.factor_type === 'totp' && x.status === 'verified');
      if (ready) return { step: 'verify', factorId: ready.id };
      // Clear half-finished set-ups so a fresh QR code can be made.
      for (const x of factors.filter((x) => x.factor_type === 'totp' && x.status !== 'verified')) {
        await call(`/auth/v1/factors/${encodeURIComponent(x.id)}`, { method: 'DELETE', auth: true }).catch(() => {});
      }
      return { step: 'enroll' };
    },
    async enroll() {
      const d = await call('/auth/v1/factors', { auth: true, body: { factor_type: 'totp', friendly_name: 'Socod admin' } });
      return { factorId: d.id, qr: d.totp && d.totp.qr_code, secret: d.totp && d.totp.secret };
    },
    async verify(factorId, code) {
      const id = encodeURIComponent(factorId);
      const ch = await call(`/auth/v1/factors/${id}/challenge`, { auth: true, body: {} });
      keep(await call(`/auth/v1/factors/${id}/verify`, { auth: true, body: { challenge_id: ch.id, code } }));
    },
    rpc(fn, args) {
      return call(`/rest/v1/rpc/${encodeURIComponent(fn)}`, { auth: true, body: args || {} });
    },
    async signOut() {
      const t = session && session.access_token;
      save(null);
      if (t) await f(`${url}/auth/v1/logout`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${t}` } }).catch(() => {});
    },
  };
}
