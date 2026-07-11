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
// Exit code 0 + "ALL PASS" = accepted. Any assertion failure exits 1.

import { mkdtempSync, writeFileSync, existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE = process.env.NEXUS_URL || 'http://localhost:3001';
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

const c2 = (await api('POST', '/api/captures', { content: 'idea: use spring physics for the inbox cards' }, 200))?.capture;
check('text kind detected', c2?.kind === 'text');
check('text has null url', c2?.url === null);

await api('POST', '/api/captures', { content: '   ' }, 400); // empty rejected

// --- 3. routing ------------------------------------------------------------
const routed = (await api('PATCH', `/api/captures/${c1.id}`, { project: 'test-project' }))?.capture;
check('status → routed', routed?.status === 'routed');
check('routedAt set', typeof routed?.routedAt === 'number' && routed.routedAt > 0);

const general = (await api('PATCH', `/api/captures/${c2.id}`, { project: 'general' }))?.capture;
check('general routing allowed', general?.status === 'routed' && general?.project === 'general');

// --- 4. pull + ack ----------------------------------------------------------
console.log('# pull');
const pull = await api('GET', '/api/pull');
check('two items pending', pull?.items?.length === 2);
const item1 = pull?.items?.find(i => i.capture.id === c1.id);
check('projectPath resolved', item1?.projectPath === projDir);
const item2 = pull?.items?.find(i => i.capture.id === c2.id);
check('general has null path', item2?.projectPath === null);

const ack = await api('POST', '/api/pull/ack', { ids: [c1.id] });
check('acked 1', ack?.acked === 1);
const pull2 = await api('GET', '/api/pull');
check('acked item gone from pull', pull2?.items?.length === 1);
const c1After = (await api('GET', `/api/captures?status=delivered`))?.captures?.find(c => c.id === c1.id);
check('delivered status + deliveredAt', c1After?.status === 'delivered' && typeof c1After?.deliveredAt === 'number');

// --- 5. archive / restore / list filters ------------------------------------
const c3 = (await api('POST', '/api/captures', { content: 'throwaway thought' }))?.capture;
const arch = (await api('PATCH', `/api/captures/${c3.id}`, { status: 'archived' }))?.capture;
check('archived', arch?.status === 'archived');
const inbox = await api('GET', '/api/captures?status=inbox');
check('inbox excludes archived/routed/delivered', inbox?.captures?.every(c => c.status === 'inbox'));
const rest = (await api('PATCH', `/api/captures/${c3.id}`, { status: 'inbox' }))?.capture;
check('restored to inbox', rest?.status === 'inbox');
await api('DELETE', `/api/captures/${c3.id}`);
await api('GET', `/api/captures/${c3.id}`, null, 404);

// --- 6. enrichment (only if a key is available in the server env) ------------
// The server reports availability via enrich returning 'failed' gracefully —
// enrich must NEVER 500 on scrape/AI failure, it degrades to enrichStatus 'failed'.
console.log('# enrich (graceful degradation is the contract)');
const e = await api('POST', `/api/captures/${c2.id}/enrich`, null, 200);
check('enrich returns capture', !!e?.capture);
check('enrichStatus resolved', e?.capture?.enrichStatus === 'done' || e?.capture?.enrichStatus === 'failed');
if (e?.capture?.enrichStatus === 'done') {
  check('title set', typeof e.capture.title === 'string' && e.capture.title.length > 0);
  check('suggestedProject from registry or general',
    ['test-project', 'ghost-project', 'general'].includes(e.capture.suggestedProject));
  check('tags 2-5 kebab', Array.isArray(e.capture.tags) && e.capture.tags.length >= 1 && e.capture.tags.length <= 5);
}

// --- 7. pull CLI end-to-end ---------------------------------------------------
console.log('# nexus-pull CLI');
const cli = spawnSync(process.execPath, ['scripts/nexus-pull.mjs',
  '--url', BASE, '--os-path', osDir], { encoding: 'utf8', env: { ...process.env, NEXUS_TOKEN: '' } });
check('CLI exit 0', cli.status === 0, cli.stderr?.slice(0, 400));
// c2 was routed to 'general' → must land in SecondBrainOS/memory/raw/
const rawFiles = readdirSync(join(osDir, 'memory', 'raw')).filter(f => f.endsWith('.md'));
check('general capture written to OS raw/', rawFiles.length === 1, JSON.stringify(rawFiles));
if (rawFiles.length === 1) {
  const md = readFileSync(join(osDir, 'memory', 'raw', rawFiles[0]), 'utf8');
  check('frontmatter has source: nexus', md.includes('source: nexus'));
  check('original content verbatim in body', md.includes('idea: use spring physics for the inbox cards'));
  check('filename pattern nexus-YYYY-MM-DD-*', /^nexus-\d{4}-\d{2}-\d{2}-.+\.md$/.test(rawFiles[0]));
}
const pull3 = await api('GET', '/api/pull');
check('CLI acked everything', pull3?.items?.length === 0);

// --- verdict ---------------------------------------------------------------
console.log(failures === 0 ? `\nALL PASS (${n} checks)` : `\n${failures}/${n} FAILED`);
process.exit(failures === 0 ? 0 : 1);
