// Nexus v2 acceptance test — CANONICAL. When docs/SPEC.md prose and this file
// disagree, this file wins. The dev server MUST run against a local throwaway
// DB, never prod Turso (.env.local has a live TURSO_DATABASE_URL — Next loads
// it automatically). The db layer therefore honors NEXUS_LOCAL_DB=1 as a hard
// override forcing file mode:
//
//   $env:NEXUS_LOCAL_DB='1'; $env:DATABASE_PATH='./data/acceptance.db'; npm run dev   (terminal 1)
//   node scripts/acceptance.mjs                                                        (terminal 2)
//
// Delete ./data/acceptance.db before the run for a clean pass. NEXUS_PASSWORD
// is not in .env.local, so auth is open locally.
//
// DELIBERATELY NOT `NEXUS_URL`: that name is the pull CLI's target and is
// commonly persisted machine-wide (setx) to point at prod for convenience.
// Reusing it here would let a persisted prod URL silently redirect this
// suite at production, defeating the NEXUS_LOCAL_DB safety net above.

import { mkdtempSync, writeFileSync, existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE = process.env.NEXUS_ACCEPTANCE_URL || 'http://localhost:3001';
let failures = 0;
let n = 0;

function check(name, cond, detail = '') {
  n++;
  if (cond) console.log(`  ok ${n} - ${name}`);
  else { failures++; console.error(`  FAIL ${n} - ${name} ${detail}`); }
}

async function api(method, path, body, expectStatus = 200) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  check(`${method} ${path} → ${expectStatus}`, res.status === expectStatus, `(got ${res.status})`);
  try { return await res.json(); } catch { return null; }
}

// --- fixtures ------------------------------------------------------------
const fixRoot = mkdtempSync(join(tmpdir(), 'nexus-acc-'));
const projDir = join(fixRoot, 'TESTPROJ');
mkdirSync(join(projDir, 'memory', 'raw'), { recursive: true });
const osDir = join(fixRoot, 'SecondBrainOS');
mkdirSync(join(osDir, 'memory', 'raw'), { recursive: true });
writeFileSync(join(osDir, 'PROJECTS.md'), `# Project Brains — Master Index
One row per project.

| Project | Path | What it is | Brain since |
|---|---|---|---|
| Test Project | ${projDir} | A test project for acceptance | 2026-07-11 |
| Ghost Project | ${join(fixRoot, 'DOES-NOT-EXIST')} | Has no local folder | 2026-07-11 |
`);

// --- 1. registry sync (API path used by the CLI) --------------------------
console.log('# projects');
const put = await api('PUT', '/api/projects', {
  projects: [
    { slug: 'test-project', name: 'Test Project', path: projDir, description: 'A test project for acceptance' },
    { slug: 'ghost-project', name: 'Ghost Project', path: join(fixRoot, 'DOES-NOT-EXIST'), description: 'Has no local folder' },
  ],
});
check('sync count === 2', put?.count === 2);
const list = await api('GET', '/api/projects');
check('projects listed', Array.isArray(list?.projects) && list.projects.length === 2);
check('slug preserved', list?.projects?.some(p => p.slug === 'test-project'));

// --- 2. capture create: url vs text detection -----------------------------
console.log('# captures');
const c1 = (await api('POST', '/api/captures', { content: 'https://example.com/some-article' }, 200))?.capture;
check('url kind detected', c1?.kind === 'url');
check('url extracted', c1?.url === 'https://example.com/some-article');
check('starts inbox/pending', c1?.status === 'inbox' && c1?.enrichStatus === 'pending');
check('content preserved verbatim', c1?.content === 'https://example.com/some-article');
check('projects starts empty', Array.isArray(c1?.projects) && c1.projects.length === 0);

const c2 = (await api('POST', '/api/captures', { content: 'idea: use spring physics for the inbox cards' }, 200))?.capture;
check('text kind detected', c2?.kind === 'text');
check('text has null url', c2?.url === null);

await api('POST', '/api/captures', { content: '   ' }, 400); // empty rejected

// Raw save: skipEnrich → terminal 'skipped' state, no AI, still routable.
const raw = (await api('POST', '/api/captures', { content: 'raw note, no AI please', skipEnrich: true }))?.capture;
check('skipEnrich → enrichStatus skipped', raw?.enrichStatus === 'skipped');
check('skipped capture is inbox + unrouted', raw?.status === 'inbox' && Array.isArray(raw?.projects) && raw.projects.length === 0);

// --- 3. routing (single and multi-target) ----------------------------------
const routed = (await api('PATCH', `/api/captures/${c1.id}`, { projects: ['test-project', 'ghost-project'] }))?.capture;
check('status → routed', routed?.status === 'routed');
check('multi-target stored', JSON.stringify(routed?.projects) === JSON.stringify(['test-project', 'ghost-project']));
check('routedAt set', typeof routed?.routedAt === 'number' && routed.routedAt > 0);

const general = (await api('PATCH', `/api/captures/${c2.id}`, { projects: ['general'] }))?.capture;
check('general routing allowed', general?.status === 'routed' && general?.projects?.[0] === 'general');

await api('PATCH', `/api/captures/${c1.id}`, { projects: [] }, 400); // empty targets rejected

// --- 4. pull + ack ----------------------------------------------------------
console.log('# pull');
const pull = await api('GET', '/api/pull');
check('two items pending', pull?.items?.length === 2);
const item1 = pull?.items?.find(i => i.capture.id === c1.id);
check('two targets on multi-routed', item1?.targets?.length === 2);
check('target path resolved', item1?.targets?.find(t => t.slug === 'test-project')?.path === projDir);
check('missing-dir target still listed', item1?.targets?.some(t => t.slug === 'ghost-project'));
const item2 = pull?.items?.find(i => i.capture.id === c2.id);
check('general target has null path', item2?.targets?.[0]?.path === null);

const ack = await api('POST', '/api/pull/ack', { ids: [c1.id] });
check('acked 1', ack?.acked === 1);
const pull2 = await api('GET', '/api/pull');
check('acked item gone from pull', pull2?.items?.length === 1);
const c1After = (await api('GET', `/api/captures?status=delivered`))?.captures?.find(c => c.id === c1.id);
check('delivered status + deliveredAt', c1After?.status === 'delivered' && typeof c1After?.deliveredAt === 'number');

// --- 5. archive / restore / delete / list filters ----------------------------
const c3 = (await api('POST', '/api/captures', { content: 'throwaway thought' }))?.capture;
const arch = (await api('PATCH', `/api/captures/${c3.id}`, { status: 'archived' }))?.capture;
check('archived', arch?.status === 'archived');
const inbox = await api('GET', '/api/captures?status=inbox');
check('inbox excludes archived/routed/delivered', inbox?.captures?.every(c => c.status === 'inbox'));
const rest = (await api('PATCH', `/api/captures/${c3.id}`, { status: 'inbox' }))?.capture;
check('restored to inbox', rest?.status === 'inbox');
await api('DELETE', `/api/captures/${c3.id}`);
await api('GET', `/api/captures/${c3.id}`, null, 404);

// --- 6. library search --------------------------------------------------------
console.log('# search');
const c4 = (await api('POST', '/api/captures', { content: 'the zebra unicorn moonshot concept' }))?.capture;
const all = await api('GET', '/api/captures?status=all');
check('status=all spans statuses', all?.captures?.some(c => c.status === 'delivered') && all?.captures?.some(c => c.status === 'inbox'));
const hit = await api('GET', '/api/captures?status=all&q=zebra%20unicorn');
check('q matches content substring', hit?.captures?.length === 1 && hit.captures[0].id === c4.id);
const miss = await api('GET', '/api/captures?status=all&q=nonexistentxyzzy');
check('q with no match returns empty', miss?.captures?.length === 0);

// --- 7. models + enrichment (graceful degradation is the contract) ------------
console.log('# models');
const modelsRes = await api('GET', '/api/models');
check('models list returned', Array.isArray(modelsRes?.models));
check('gpt-4o-mini selectable (OPENAI_API_KEY set)', modelsRes?.models?.some(m => m.id === 'gpt-4o-mini'));

console.log('# enrich');
const e = await api('POST', `/api/captures/${c2.id}/enrich`, {}, 200);
check('enrich returns capture', !!e?.capture);
// Forced model: single attempt, no fallback chain.
const eForced = await api('POST', `/api/captures/${c2.id}/enrich`, { modelId: 'gpt-4o-mini' }, 200);
check('forced-model enrich resolves', eForced?.capture?.enrichStatus === 'done' || eForced?.capture?.enrichStatus === 'failed');
check('enrichStatus resolved', e?.capture?.enrichStatus === 'done' || e?.capture?.enrichStatus === 'failed');
if (e?.capture?.enrichStatus === 'done') {
  check('title set', typeof e.capture.title === 'string' && e.capture.title.length > 0);
  check('suggestedProject from registry or general',
    ['test-project', 'ghost-project', 'general'].includes(e.capture.suggestedProject));
  check('tags 2-5 kebab', Array.isArray(e.capture.tags) && e.capture.tags.length >= 1 && e.capture.tags.length <= 5);
}

// --- 8. ask (AI Q&A over capture history) --------------------------------------
console.log('# ask');
{
  const res = await fetch(BASE + '/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: 'Where did the zebra unicorn idea end up?' }),
  });
  check('ask returns 200 or 502', res.status === 200 || res.status === 502, `(got ${res.status})`);
  const body = await res.json().catch(() => null);
  if (res.status === 200) {
    check('ask has answer text', typeof body?.answer === 'string' && body.answer.length > 0);
    check('ask has references array', Array.isArray(body?.references));
    check('references have valid shape', body.references.every(r => typeof r.id === 'string' && Array.isArray(r.projects)));
  } else {
    check('ask 502 carries error', typeof body?.error === 'string');
  }
  await fetch(BASE + '/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '' }),
  }).then(r => check('empty question → 400', r.status === 400, `(got ${r.status})`));
}

// --- 9. pull CLI end-to-end (multi-target write) --------------------------------
console.log('# nexus-pull CLI');
// c2 is routed to 'general'; also multi-route c4 to both projects to test fan-out.
await api('PATCH', `/api/captures/${c4.id}`, { projects: ['test-project', 'ghost-project'] });
const cli = spawnSync(process.execPath, ['scripts/nexus-pull.mjs',
  '--url', BASE, '--os-path', osDir], { encoding: 'utf8', env: { ...process.env, NEXUS_TOKEN: '' } });
check('CLI exit 0', cli.status === 0, cli.stderr?.slice(0, 400));
const osRaw = readdirSync(join(osDir, 'memory', 'raw')).filter(f => f.endsWith('.md'));
const projRaw = readdirSync(join(projDir, 'memory', 'raw')).filter(f => f.endsWith('.md'));
// osDir gets: c2 (general) + c4's ghost-project fallback = 2. projDir gets: c4 = 1.
check('general + ghost fallback in OS raw/', osRaw.length === 2, JSON.stringify(osRaw));
check('multi-routed file in project raw/', projRaw.length === 1, JSON.stringify(projRaw));
const springFile = osRaw.map(f => readFileSync(join(osDir, 'memory', 'raw', f), 'utf8'))
  .find(md => md.includes('idea: use spring physics for the inbox cards'));
check('frontmatter has source: nexus', !!springFile && springFile.includes('source: nexus'));
check('original content verbatim in body', !!springFile);
check('filename pattern nexus-YYYY-MM-DD-*', osRaw.every(f => /^nexus-\d{4}-\d{2}-\d{2}-.+\.md$/.test(f)));
const pull3 = await api('GET', '/api/pull');
check('CLI acked everything', pull3?.items?.length === 0);

// --- verdict ---------------------------------------------------------------
console.log(failures === 0 ? `\nALL PASS (${n} checks)` : `\n${failures}/${n} FAILED`);
process.exit(failures === 0 ? 0 : 1);
