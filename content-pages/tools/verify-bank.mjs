#!/usr/bin/env node
/**
 * Mechanical gate for goodword/daily-bank.json (the P-ZERO check).
 *
 * Re-verifies every question character-for-character against the 1769 KJV
 * (via the `kjv` npm package) and enforces the bank rules:
 *   - verse === KJV text (translator brackets and paragraph marks stripped)
 *   - prompt === verse with exactly one "_____" in place of the answer, at the
 *     answer's first occurrence (the game bolds the first match on reveal)
 *   - answer is lowercase a–z, appears in the verse as-is, never a sacred name,
 *     never a translator-supplied [bracketed] word
 *   - required fields present, role/label match the pool, unique ids
 *   - no duplicate refs within or across pools
 *   - no teaser-bank refs (book-page sample verses + original tester verses)
 *
 * Usage:  cd content-pages/tools && npm install && node verify-bank.mjs [bank.json]
 * Exit 0 = clean, 1 = violations (each printed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const GW = path.join(HERE, '..', 'goodword');
const KJV = require('kjv/json/verses-1769.json');

const POOLS = {
  'Cold Open': 'Bible Study',
  'Recovery Grace': 'Warm-Up Word',
  'Middle Test': 'Sunday School',
  'Deep Water': 'Deep Water',
  'Pulpit Ready': "Don't Play With Me",
};
const SACRED = new Set(['lord', 'god', 'jesus', 'christ', 'jehovah', 'messiah', 'ghost']);
const ALIASES = [[/^Psalm /, 'Psalms '], [/^Song of Solomon /, "Solomon's Song "], [/^Song of Songs /, "Solomon's Song "]];
// Original tester build verses (repo-root index.html) — teaser bank, never in the daily.
const TESTER_REFS = ['Romans 8:28', 'Psalm 23:1', 'John 3:16', 'Micah 6:8', 'Hebrews 11:1'];

const canon = ref => ALIASES.reduce((r, [re, to]) => r.replace(re, to), ref.trim());
const clean = t => t.replace(/[[\]]/g, '').replace(/^#\s*/, '').trim();

const bankPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(GW, 'daily-bank.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const content = JSON.parse(fs.readFileSync(path.join(GW, 'content-data.json'), 'utf8'));
const teaser = new Set([...content.books.map(b => b.sampleVerse.reference), ...TESTER_REFS].map(canon));

const errs = [];
const seenRefs = new Map();
const seenIds = new Set();
let total = 0;

for (const [role, label] of Object.entries(POOLS)) {
  const pool = bank[role];
  if (!Array.isArray(pool) || !pool.length) { errs.push(`pool "${role}" missing or empty`); continue; }
  pool.forEach((q, n) => {
    total++;
    const at = `${role}[${n}] ${q.id || '?'} ${q.ref || '?'}`;
    const bad = m => errs.push(`${at}: ${m}`);
    for (const f of ['id', 'role', 'ref', 'label', 'missing', 'close', 'prompt', 'verse', 'note'])
      if (q[f] === undefined || q[f] === '') bad(`missing field "${f}"`);
    if (q.role !== role) bad(`role "${q.role}" != pool "${role}"`);
    if (q.label !== label) bad(`label "${q.label}" != "${label}"`);
    if (seenIds.has(q.id)) bad('duplicate id'); seenIds.add(q.id);
    if (!Array.isArray(q.close)) bad('close must be an array');

    const ref = canon(q.ref || '');
    const raw = KJV[ref];
    if (!raw) { bad(`ref not in KJV corpus (as "${ref}")`); return; }
    if (seenRefs.has(ref)) bad(`duplicate ref (also ${seenRefs.get(ref)})`); else seenRefs.set(ref, at);
    if (teaser.has(ref)) bad('ref is in the teaser bank (book-page sample / tester verse)');

    const verse = clean(raw);
    if (q.verse !== verse) bad(`verse text != KJV\n    bank: ${q.verse}\n    kjv:  ${verse}`);

    const m = q.missing || '';
    if (!/^[a-z]+$/.test(m)) bad(`answer "${m}" is not lowercase a–z`);
    if (SACRED.has(m)) bad(`answer "${m}" is a sacred name`);

    const blanks = (q.prompt || '').split('_____').length - 1;
    if (blanks !== 1) bad(`prompt has ${blanks} blanks (need exactly 1)`);
    else {
      // the verse word may be capitalized (sentence start); the game compares case-insensitively
      const pos = q.prompt.indexOf('_____');
      const atBlank = q.verse.slice(pos, pos + m.length);
      if (atBlank.toLowerCase() !== m || q.prompt.replace('_____', atBlank) !== q.verse)
        bad('prompt with answer filled in != verse');
    }

    // The answer at the blank must be the first whole-word occurrence (game bolds the first match)
    const re = new RegExp(`\\b${m}\\b`, 'i');
    const first = q.verse.search(re);
    if (first === -1) bad(`answer "${m}" not found as a whole word in verse`);
    else if (first !== (q.prompt || '').indexOf('_____')) bad('blank is not at the first occurrence of the answer');

    // Translator-supplied words are italic/bracketed in the KJV — never blank one
    const brk = [...raw.matchAll(/\[([^\]]*)\]/g)].map(x => x[1].toLowerCase());
    if (brk.some(s => new RegExp(`\\b${m}\\b`).test(s))) {
      // only a violation if every occurrence of the word is bracketed
      const unbr = raw.replace(/\[[^\]]*\]/g, '');
      if (!new RegExp(`\\b${m}\\b`, 'i').test(unbr)) bad(`answer "${m}" is translator-supplied [bracketed]`);
    }
    for (const c of q.close || []) {
      if (typeof c !== 'string' || c.toLowerCase() === m) bad(`bad close entry "${c}"`);
    }
  });
}

const counts = Object.keys(POOLS).map(r => `${r} ${bank[r]?.length ?? 0}`).join(' · ');
console.log(`${total} questions — ${counts}`);
if (errs.length) { console.log(`\n${errs.length} violation(s):`); errs.forEach(e => console.log(' ✗ ' + e)); process.exit(1); }
console.log('✓ all checks passed');
