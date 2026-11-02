// Sends learner profiles + progress from this device to /api/sync when online.
(() => {
  const DB = 'look1-practice', DEV = 'look1.device', HASH = 'look1.syncHash';
  let busy = false;
  const device = () => { try { let d = localStorage.getItem(DEV); if (!d) { d = crypto.randomUUID(); localStorage.setItem(DEV, d); } return d; } catch { return null; } };
  const all = (db, s) => new Promise((res, rej) => { const r = db.transaction(s, 'readonly').objectStore(s).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function read() {
    // Never create the DB ourselves: the app must be the one to create it.
    if (!indexedDB.databases) return null;
    if (!(await indexedDB.databases()).some(d => d.name === DB)) return null;
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open(DB);
      r.onupgradeneeded = () => r.transaction.abort();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    try {
      const names = ['profiles', 'progress', 'items'];
      if (!names.every(s => db.objectStoreNames.contains(s))) return null;
      const [profiles, progress, items] = await Promise.all(names.map(s => all(db, s)));
      return { profiles, progress, items };
    } finally { db.close(); }
  }
  async function sync() {
    if (busy || !navigator.onLine) return;
    busy = true;
    try {
      const d = await read();
      const dev = device();
      if (!d || !d.profiles.length || !dev) return;
      const body = JSON.stringify({ device: dev, ...d });
      const last = Math.max(0, ...d.progress.map(r => r.updated || 0), ...d.items.map(r => r.updated || 0));
      const h = body.length + ':' + last;
      if (localStorage.getItem(HASH) === h) return;
      const r = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: body.length < 60000 });
      if (r.ok) localStorage.setItem(HASH, h);
    } catch { /* offline or server unavailable: try again later */ } finally { busy = false; }
  }
  setTimeout(sync, 4000);
  setInterval(sync, 60000);
  addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => document.hidden && sync());
})();
