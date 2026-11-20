// Leonida Ledger — a gta6-trophy-guide-01 entry (Node 22, standard library only).
//
// The guide itself is app/: plain static files a browser opens at app/index.html
// (ES modules, CSS, no build step), working offline — it loads nothing over the
// network, and its trophy list and guides live in app/data/trophies.json.
// This program hands the entry in: it copies app/ and screenshots/ from beside
// this file into /output and writes /output/dossier.json, the summary the judge
// reads (the screenshots, the first load's files and bytes, and the source),
// using the vendored make.fun library. Leave vendor/makefun-frontend.ts alone:
// the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Run it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

// Fail fast on the mistakes a stale tree would hand the scorer: a missing app
// folder, or a screenshots folder holding more than the four images the gate
// allows. buildDossier would refuse those too, but a plain message here is
// cheaper to read than the library's.
if (!existsSync(appDir)) throw new Error(`app/ is missing beside ${here}main.ts`);
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length > 4) throw new Error(`screenshots/ holds ${shots.length} files; the gate allows at most 4`);
}

// Round 2: validate the guide data before anything is copied, so a broken
// trophy list fails here with a readable message instead of shipping a
// dossier built from bad data. The counts below are the official list's
// shape (55 trophies; stages of 13/7/19/14/2; 8 possibly-missable flags),
// and every missable trophy must carry its round-2 verification note.
const guidePath = join(appDir, 'data', 'trophies.json');
const guide = JSON.parse(readFileSync(guidePath, 'utf-8'));
const guideTrophies = guide.trophies ?? [];
if (guideTrophies.length !== 55) throw new Error(`trophies.json holds ${guideTrophies.length} trophies; the official list has 55`);
const stageTotals = [1, 2, 3, 4, 5].map((stage) => guideTrophies.filter((t) => t.stage === stage).length);
const expectedStages = [13, 7, 19, 14, 2];
stageTotals.forEach((total, i) => {
  if (total !== expectedStages[i]) throw new Error(`stage ${i + 1} holds ${total} trophies; the roadmap expects ${expectedStages[i]}`);
});
const missableTrophies = guideTrophies.filter((t) => t.missable);
if (missableTrophies.length !== 8) throw new Error(`trophies.json flags ${missableTrophies.length} missable trophies; the guide expects 8`);
for (const t of missableTrophies) {
  if (!t.missable_check || t.missable_check.verified_in_play !== false || !t.missable_check.do_early) {
    throw new Error(`missable trophy ${t.name} is missing its verification note (missable_check)`);
  }
}
console.log(`guide data OK: 55 trophies, stages ${stageTotals.join('/')}, ${missableTrophies.length} possibly missable`);

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in app/
// or 48 MiB of app files — app/ counts beside /output's own 1000-entry cap,
// its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

// Round 2, second pass: confirm the dossier actually landed and say how
// big it is, so a silent write failure cannot pass as a good build.
const dossierPath = join(out, 'dossier.json');
const dossierRaw = readFileSync(dossierPath);
if (dossierRaw.length === 0) throw new Error(`dossier.json at ${dossierPath} is empty`);
const dossierSections = Object.keys(JSON.parse(dossierRaw.toString('utf-8'))).sort().join(', ');
console.log(`dossier OK: ${dossierRaw.length} bytes, sections: ${dossierSections}`);
