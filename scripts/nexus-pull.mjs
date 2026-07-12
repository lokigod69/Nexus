#!/usr/bin/env node
// nexus-pull — sync the SecondBrainOS project registry up to Nexus, pull
// routed captures down, and write them into each project's memory/raw/.
//
// Node >= 18, zero npm deps.
//
// Flags:   --url <base>   --token <token>   --os-path <dir>   --dry-run
// Env:     NEXUS_URL, NEXUS_TOKEN, SECONDBRAIN_PATH
// Default: url http://localhost:3001, os-path D:\CODING\SecondBrainOS

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// --- args -------------------------------------------------------------

function parseArgs(argv) {
  const args = { 'dry-run': false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args['dry-run'] = true;
    else if (arg === '--url') args.url = argv[++i];
    else if (arg === '--token') args.token = argv[++i];
    else if (arg === '--os-path') args['os-path'] = argv[++i];
    else {
      console.error(`Unknown argument: ${arg}`);
      console.error('Usage: nexus-pull [--url <base>] [--token <token>] [--os-path <dir>] [--dry-run]');
      process.exit(1);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const BASE = (args.url || process.env.NEXUS_URL || 'http://localhost:3001').replace(/\/+$/, '');
const TOKEN = args.token ?? process.env.NEXUS_TOKEN ?? '';
const OS_PATH = args['os-path'] || process.env.SECONDBRAIN_PATH || 'D:\\CODING\\SecondBrainOS';
const DRY_RUN = args['dry-run'];

// --- http -------------------------------------------------------------

function headers() {
  const h = { 'content-type': 'application/json' };
  if (TOKEN) h['x-nexus-token'] = TOKEN;
  return h;
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error || ''; } catch { /* ignore */ }
    throw new Error(`${method} ${path} → ${res.status}${detail ? ` (${detail})` : ''}`);
  }
  return res.json();
}

// --- helpers ------------------------------------------------------------

/** kebab-case: lowercase, strip anything in parentheses, non-alnum → '-'. */
function kebab(text) {
  return String(text)
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isoDate(unixSeconds) {
  const d = unixSeconds ? new Date(unixSeconds * 1000) : new Date();
  return d.toISOString().slice(0, 10);
}

/** Parse the PROJECTS.md master table: | Project | Path | What it is | Brain since | */
function parseProjectsMd(md) {
  const projects = [];
  for (const line of md.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    if (/^:?-{2,}:?$/.test(cells[0])) continue; // separator row
    if (cells[0].toLowerCase() === 'project') continue; // header row
    const [name, path, description] = cells;
    if (!name || !path) continue;
    const slug = kebab(name);
    if (!slug) continue;
    projects.push({ slug, name, path, description: description || '' });
  }
  return projects;
}

/** Raw markdown file per SPEC.md "Pull CLI": frontmatter + body.
 *  One file per target; routed-to names THAT target ('general' when the
 *  target has no registry name — the 'general' slug or an unknown slug). */
function buildMarkdown(capture, target) {
  const c = capture;
  const fm = ['---', 'source: nexus', `captured: ${isoDate(c.createdAt)}`];
  if (c.url) fm.push(`url: ${c.url}`);
  fm.push(`tags: [${(c.tags || []).join(', ')}]`);
  fm.push(`routed-to: ${target?.name || 'general'}`);
  fm.push('---');

  const heading = c.title || c.content.slice(0, 60);
  const body = [`# ${heading}`, ''];
  if (c.takeaway) body.push(`**Takeaway:** ${c.takeaway}`, '');
  if (c.summary) body.push(c.summary, '');
  body.push('## Original', c.content);
  if (c.kind === 'url' && c.extract) {
    body.push('', '## Extract', c.extract);
  }

  return fm.join('\n') + '\n\n' + body.join('\n') + '\n';
}

/** nexus-YYYY-MM-DD-<slug>.md with -2/-3… suffix on collision. */
function uniqueFilename(dir, capture) {
  const slug = kebab(capture.title || capture.content.slice(0, 60)) || capture.id;
  const base = `nexus-${isoDate(capture.createdAt)}-${slug}`;
  let name = `${base}.md`;
  for (let i = 2; existsSync(join(dir, name)); i++) {
    name = `${base}-${i}.md`;
  }
  return name;
}

// --- main -----------------------------------------------------------------

async function main() {
  console.log(`nexus-pull → ${BASE}${DRY_RUN ? ' (dry run)' : ''}`);

  // a) Registry sync up: PROJECTS.md → PUT /api/projects
  const projectsMdPath = join(OS_PATH, 'PROJECTS.md');
  if (existsSync(projectsMdPath)) {
    const registry = parseProjectsMd(readFileSync(projectsMdPath, 'utf8'));
    if (DRY_RUN) {
      console.log(`[dry-run] would sync ${registry.length} project(s): ${registry.map((p) => p.slug).join(', ')}`);
    } else {
      const { count } = await api('PUT', '/api/projects', { projects: registry });
      console.log(`Synced ${count} project(s) from PROJECTS.md`);
    }
  } else {
    console.warn(`WARN: ${projectsMdPath} not found — skipping registry sync`);
  }

  // b) Pull routed, undelivered captures
  const { items } = await api('GET', '/api/pull');
  if (!items || items.length === 0) {
    console.log('Nothing to pull — inbox is clear.');
    return;
  }
  console.log(`${items.length} capture(s) to deliver`);

  // c) One raw file PER TARGET into <target-path>/memory/raw/ ('general',
  //    unknown slug, or a path missing on disk → SecondBrainOS/memory/raw/).
  //    A capture id is acked only after ALL of its targets were written.
  const written = [];
  for (const item of items) {
    const c = item.capture;
    const targets =
      Array.isArray(item.targets) && item.targets.length > 0
        ? item.targets
        : [{ slug: 'general', name: null, path: null }];

    let allTargetsWritten = true;
    for (const target of targets) {
      let root = OS_PATH;
      if (target.path) {
        if (existsSync(target.path)) {
          root = target.path;
        } else {
          console.warn(`WARN: project path missing on disk: ${target.path} — writing to ${OS_PATH}\\memory\\raw\\ instead`);
        }
      }

      const rawDir = join(root, 'memory', 'raw');
      const label = target.name || target.slug || 'general';
      if (DRY_RUN) {
        console.log(`[dry-run] would write "${c.title || c.content.slice(0, 40)}" → ${rawDir} [${label}]`);
        continue;
      }

      try {
        mkdirSync(rawDir, { recursive: true });
        const filename = uniqueFilename(rawDir, c);
        writeFileSync(join(rawDir, filename), buildMarkdown(c, target), 'utf8');
        console.log(`  wrote ${join(rawDir, filename)} [${label}]`);
      } catch (err) {
        console.error(`ERROR: failed to write target "${label}" for capture ${c.id}: ${err.message}`);
        allTargetsWritten = false;
      }
    }

    if (!DRY_RUN && allTargetsWritten) written.push(c.id);
  }

  // d) Ack only what was actually written
  if (DRY_RUN) {
    console.log('[dry-run] no files written, nothing acked.');
    return;
  }
  if (written.length > 0) {
    const { acked } = await api('POST', '/api/pull/ack', { ids: written });
    console.log(`Acked ${acked}/${written.length} capture(s) as delivered.`);
  } else {
    console.log('No files written, nothing acked.');
  }
}

main().catch((err) => {
  console.error(`nexus-pull failed: ${err.message}`);
  process.exit(1);
});
