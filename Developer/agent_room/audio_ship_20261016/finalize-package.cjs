// Advisor-only handoff. Never commits, copies to release, deploys, or changes game data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const rel = p => path.relative(root, p).split(path.sep).join('/');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read = p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8').replace(/^\uFEFF/, ''));
const audit = read('soundmini/scope-audit.json');
const decode = read('soundmini/decode-measurements.json');
const browser = read('advisor-browser-qa.json');
assert.equal(audit.passed, true);
assert.equal(decode.summary.cases, 93);
assert.equal(decode.summary.candidates, 279);
assert.equal(decode.summary.decodedClips, 462);
assert.deepEqual(decode.summary.failures, []);
assert.equal(browser.passed, true);
assert.equal(browser.closed, true);
assert.equal(browser.played.length, 372);
assert.equal(read('soundmini/reproducibility.json').deterministic, true);
for (const row of audit.exactImplementationFiles) assert.equal(hash(path.join(root, row.path)), row.sha256, 'scope drift: '+row.path);
const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/));
const reason = p => p.includes('/public/sfx/audition-') ? 'Add original-comparison dialogue renders and distinct A/B/C audition samples; no automatic runtime selection.'
  : p.endsWith('sfx-audition-20261016.html') ? 'Provide all-case original/A/B/C playback, cancellation, search and memory-only preference export.'
  : p.endsWith('dialogueVoice.js') ? 'Restore per-glyph contour and isolate utterance cancellation; await unlock safely and clean audio nodes.'
  : p.endsWith('sfxRegistry.js') ? 'Recover transient load failures, release invalid/paused slots and unload failed Howls without stale callbacks.'
  : p.endsWith('audio_asset_provenance_manifest_2026-07-30.json') ? 'Correct only Inucon metadata against unchanged bb88ebb9 assets and dated generation record.'
  : p.includes('/scripts/') ? 'Reproducible audition generation/rendering/measurement or import-safe reuse of existing synthesis.'
  : p.includes('.test.') ? 'Focused regression verification for the real playback and generation paths.'
  : 'Scoped role, source, hash, test and verification evidence.';
const implementation = [...audit.exactImplementationFiles.map(r => r.path), 'Developer/r3f_prototype/public/sfx-audition-20261016.html'];
const evidence = [
  'advisor-baseline.md', 'advisor-final-tests.txt', 'advisor-browser-qa.cjs', 'advisor-browser-qa.json',
  'audition-desktop-verified.png', 'audition-mobile-verified.png', 'finalize-package.cjs',
  'uimini-audition.test.cjs', 'uimini/node-tests.txt', 'uimini/disposal-red.txt', 'uimini/sha256.json',
  'soundmini/README.md', 'soundmini/source-reason-sha.json', 'soundmini/decode-measurements.json',
  'soundmini/dialogue-render.json', 'soundmini/reproducibility.json', 'soundmini/focused-tests.txt',
  'soundmini/audit-preservation.py', 'soundmini/scope-audit.json',
].map(p => rel(path.join(__dirname, p)));
evidence.push('Quaility_Assurance/audio_ship_20261016/uimini/node-review.md', 'Quaility_Assurance/audio_ship_20261016_soundmini.md');
const files = [...new Set([...implementation, ...evidence])].map(p => ({
  path: p, source: path.join(root, p), action: tracked.has(p) ? 'modify' : 'add',
  bytes: fs.statSync(path.join(root, p)).size, sha256: hash(path.join(root, p)), reason: reason(p),
}));
const result = {
  status: 'READY', generatedAt: new Date().toISOString(), canonicalRoot: root,
  candidateRoot: path.resolve(root, '../releases/integrated-game-20261016-t_e2815ba8'),
  integrationOwner: 'term_af12cb1e-0b5e-44fd-a413-e31f83dc0a66',
  deploymentOwnerOnly: true, sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding:'utf8'}).trim(),
  implementationFiles: implementation.length, files, deletions: [],
  checks: { unitTests: 63, auditionControlTests: 9, browserPlaybacks: 372, ...decode.summary, preservation: audit.checks },
  originalFiles: decode.originalPreservation,
  sourceEvidence: 'Developer/agent_room/audio_ship_20261016/soundmini/source-reason-sha.json',
  limitations: ['Objective measurements and actual browser playback do not represent user listening preference approval or mobile-device speaker QA.', '14 original-format files contain full-scale-adjacent samples; originals remain unchanged for comparison.', 'A/B/C are audition alternatives, not silently selected game replacements. Actual game runtime receives scoped reliability/contour fixes.', 'Final production build, integration, commit, push and deployment belong exclusively to integration owner.'],
};
const manifestPath = path.join(__dirname, 'package-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2)+'\n');
const ready = { status: 'READY', manifest: rel(manifestPath), sha256: hash(manifestPath), generatedAt: result.generatedAt, files: files.length, deletions: [] };
fs.writeFileSync(path.join(__dirname, 'READY.json'), JSON.stringify(ready, null, 2)+'\n');
console.log(JSON.stringify(ready));
