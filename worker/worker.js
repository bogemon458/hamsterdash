// Hamster Dash leaderboard API (Cloudflare Worker + D1).
// POST /start   {round}                       → {id}       a run ticket, timestamped on the server
// POST /submit  {id, pid, name, char, score, seeds, dist, stomps, bonus, upg} → {ok, rank: {round, today, all}}
// GET  /top?board=round&round=N | board=today | board=all → {rows}
// Anti-cheat is plausibility-based: the score must match its parts, and the run must have lasted at least as long as the
// game's speed curve allows for the distance claimed (speed is a pure function of distance, see the whitepaper §4.3).

const ORIGINS = ['https://hamsterdash.site', 'https://www.hamsterdash.site'];
const CHARS = ['pip', 'mochi', 'biscuit', 'nova', 'ziggy', 'squeek'];
const GENESIS = 1793735400, ROUND_S = 600;

function cors(req) {
  const o = req.headers.get('Origin');
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin' };
}
const json = (req, data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...cors(req), ...extra } });
const int = v => Number.isInteger(v) && v >= 0 && v < 1e9;
// minimum seconds to cover distance d (game units) with speed v(d) = min(980, sqrt(360² + 18 d))
function tMin(d) { const a = 360, cap = (980 * 980 - a * a) / 18; return d <= cap ? (Math.sqrt(a * a + 18 * d) - a) / 9 : (980 - a) / 9 + (d - cap) / 980; }
const roundAt = ms => Math.floor((ms / 1000 - GENESIS) / ROUND_S) + 1;
const dayStart = ms => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
async function ipKey(req) {
  const ip = req.headers.get('CF-Connecting-IP') || '0';
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hamsterdash:' + ip));
  return [...new Uint8Array(h).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// best row per player, newest name
const TOP = where => `SELECT s.pid, (SELECT name FROM scores n WHERE n.pid = s.pid ORDER BY ts DESC LIMIT 1) AS name, MAX(s.score) AS score,
  s.char, s.dist_m, s.seeds, s.stomps, s.upg FROM scores s WHERE ${where} GROUP BY s.pid ORDER BY score DESC LIMIT 25`;
const RANK = where => `SELECT COUNT(*) AS n FROM (SELECT MAX(score) AS b FROM scores WHERE ${where} AND pid != ? GROUP BY pid) WHERE b > ?`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url), now = Date.now();
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    try {
      if (url.pathname === '/start' && req.method === 'POST') {
        const b = await req.json().catch(() => ({}));
        if (!int(b.round) || Math.abs(b.round - roundAt(now)) > 2) return json(req, { error: 'round' }, 400);
        const ip = await ipKey(req);
        const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE ip = ? AND t0 > ?').bind(ip, now - 10000).first();
        if (recent.n >= 6) return json(req, { error: 'slow down' }, 429);
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO runs (id, round, ip, t0, used) VALUES (?, ?, ?, ?, 0)').bind(id, b.round, ip, now).run();
        if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM runs WHERE t0 < ?').bind(now - 86400000).run();
        return json(req, { id });
      }
      if (url.pathname === '/submit' && req.method === 'POST') {
        const b = await req.json().catch(() => ({}));
        const name = String(b.name || '').trim().replace(/\s+/g, ' ');
        if (typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/.test(b.id) || typeof b.pid !== 'string' || !/^[0-9a-z-]{8,40}$/.test(b.pid)) return json(req, { error: 'id' }, 400);
        if (!/^[A-Za-z0-9_.\- ]{2,16}$/.test(name)) return json(req, { error: 'name' }, 400);
        if (!CHARS.includes(b.char)) return json(req, { error: 'char' }, 400);
        for (const k of ['score', 'seeds', 'dist', 'stomps', 'bonus', 'upg']) if (!int(b[k])) return json(req, { error: k }, 400);
        const run = await env.DB.prepare('SELECT round, t0, used FROM runs WHERE id = ?').bind(b.id).first();
        if (!run || run.used) return json(req, { error: 'run' }, 400);
        const secs = (now - run.t0) / 1000, m = Math.floor(b.dist / 100);
        const plausible =
          b.score === b.seeds * 10 + m + b.bonus &&             // score is exactly its parts
          secs >= tMin(b.dist) * 0.9 - 1 &&                    // could not have run faster than the speed curve
          secs < 3 * 3600 &&
          b.seeds <= m * 2 + 40 &&                             // seed density (double during a live wheel)
          b.stomps <= m / 2 + 5 &&
          b.bonus <= 200 * b.stomps * (b.stomps + 1) / 2 &&    // stomp base ≤ 75 + 5 × 15, combos grow by 1 per stomp
          b.upg <= 25;
        await env.DB.prepare('UPDATE runs SET used = 1 WHERE id = ?').bind(b.id).run();
        if (!plausible) return json(req, { error: 'rejected' }, 422);
        await env.DB.prepare('INSERT INTO scores (round, pid, name, score, seeds, dist_m, stomps, char, upg, ts, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(run.round, b.pid, name, b.score, b.seeds, m, b.stomps, b.char, b.upg, now, await ipKey(req)).run();
        const [r1, r2, r3] = await Promise.all([
          env.DB.prepare(RANK('round = ?')).bind(run.round, b.pid, b.score).first(),
          env.DB.prepare(RANK('ts >= ?')).bind(dayStart(now), b.pid, b.score).first(),
          env.DB.prepare(RANK('1 = 1')).bind(b.pid, b.score).first(),
        ]);
        return json(req, { ok: true, round: run.round, rank: { round: r1.n + 1, today: r2.n + 1, all: r3.n + 1 } });
      }
      if (url.pathname === '/top' && req.method === 'GET') {
        const board = url.searchParams.get('board') || 'round';
        let q;
        if (board === 'round') { const r = +url.searchParams.get('round'); if (!int(r)) return json(req, { error: 'round' }, 400); q = env.DB.prepare(TOP('s.round = ?')).bind(r); }
        else if (board === 'today') q = env.DB.prepare(TOP('s.ts >= ?')).bind(dayStart(now));
        else q = env.DB.prepare(TOP('1 = 1'));
        const { results } = await q.all();
        return json(req, { board, rows: results }, 200, { 'Cache-Control': 'public, max-age=10' });
      }
      if (url.pathname === '/') return json(req, { name: 'hamsterdash-api', ok: true });
      return json(req, { error: 'not found' }, 404);
    } catch (e) {
      return json(req, { error: 'server' }, 500);
    }
  },
};
