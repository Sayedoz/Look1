// Cloudflare Pages worker (advanced mode). Needs: D1 binding "DB" + secret "ADMIN_PASSWORD".
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
let ready = false;
async function init(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS learners(id TEXT PRIMARY KEY, device TEXT, name TEXT, avatar TEXT, created INTEGER, stars INTEGER DEFAULT 0, done INTEGER DEFAULT 0, correct INTEGER DEFAULT 0, wrong INTEGER DEFAULT 0, progress TEXT, items TEXT, first_seen INTEGER, last_sync INTEGER, deleted INTEGER DEFAULT 0)`).run();
  ready = true;
}
async function authed(req, env) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const u = req.headers.get('x-admin-user') || '';
  if (!env.ADMIN_PASSWORD || !t) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(u + '\0' + t)),
    crypto.subtle.digest('SHA-256', enc.encode((env.ADMIN_USER || 'Teacher') + '\0' + env.ADMIN_PASSWORD)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let d = 0;
  for (let i = 0; i < 32; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === '/api/sync' && req.method === 'POST') {
      if (!env.DB) return json({ error: 'DB binding missing' }, 500);
      const raw = await req.text();
      if (raw.length > 400000) return json({ error: 'too large' }, 413);
      let b;
      try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
      await init(env.DB);
      const now = Date.now();
      const device = String(b.device || '').slice(0, 64);
      const stmts = [];
      for (const pr of (Array.isArray(b.profiles) ? b.profiles : []).slice(0, 20)) {
        const id = String(pr.id || '').slice(0, 64);
        if (!id) continue;
        const prog = (Array.isArray(b.progress) ? b.progress : []).filter(r => r.profileId === pr.id).slice(0, 2000)
          .map(r => [String(r.unit), String(r.section), String(r.activity), r.stars | 0, r.attempts | 0, r.updated | 0]);
        const items = (Array.isArray(b.items) ? b.items : []).filter(r => r.profileId === pr.id).slice(0, 3000)
          .map(r => [String(r.itemId), r.box | 0, r.correct | 0, r.wrong | 0]);
        const stars = prog.reduce((s, r) => s + r[3], 0);
        const correct = items.reduce((s, r) => s + r[2], 0);
        const wrong = items.reduce((s, r) => s + r[3], 0);
        stmts.push(env.DB.prepare(
          `INSERT INTO learners(id,device,name,avatar,created,stars,done,correct,wrong,progress,items,first_seen,last_sync)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET device=excluded.device,name=excluded.name,avatar=excluded.avatar,stars=excluded.stars,done=excluded.done,
             correct=excluded.correct,wrong=excluded.wrong,progress=excluded.progress,items=excluded.items,last_sync=excluded.last_sync
           WHERE learners.deleted=0`
        ).bind(id, device, String(pr.name || '').slice(0, 12), String(pr.avatar || '').slice(0, 16), pr.created | 0, stars, prog.length, correct, wrong, JSON.stringify(prog), JSON.stringify(items), now, now));
      }
      if (stmts.length) await env.DB.batch(stmts);
      return json({ ok: true });
    }

    if (p.startsWith('/api/admin/')) {
      if (!(await authed(req, env))) {
        await new Promise(r => setTimeout(r, 500));
        return json({ error: 'unauthorized' }, 401);
      }
      if (!env.DB) return json({ error: 'DB binding missing' }, 500);
      await init(env.DB);
      if (p === '/api/admin/learners' && req.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM learners WHERE deleted=0 ORDER BY last_sync DESC').all();
        return json({ learners: results.map(r => ({ ...r, progress: JSON.parse(r.progress || '[]'), items: JSON.parse(r.items || '[]') })) });
      }
      const m = p.match(/^\/api\/admin\/learners\/([^/]+)$/);
      if (m && req.method === 'DELETE') {
        await env.DB.prepare(`UPDATE learners SET deleted=1,name='',avatar='',progress=NULL,items=NULL,device=NULL WHERE id=?`).bind(decodeURIComponent(m[1])).run();
        return json({ ok: true });
      }
      return json({ error: 'not found' }, 404);
    }

    return env.ASSETS.fetch(req);
  },
};
