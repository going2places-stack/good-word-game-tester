#!/usr/bin/env node
/**
 * How many days of never-played daily verses are left?
 *
 *   node check-runway.mjs            -> prints the runway
 *   node check-runway.mjs --min 60   -> also exits 2 when fewer than 60 days remain
 *
 * Writes `runway=<days>` and `last_fresh=<YYYY-MM-DD>` to $GITHUB_OUTPUT when run in Actions.
 * No dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const GW = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'goodword');
const rotation = require(path.join(GW, 'rotation.js'));
const bank = JSON.parse(fs.readFileSync(path.join(GW, 'daily-bank.json'), 'utf8'));

const today = rotation.dayOf(rotation.todayET());
const lastFresh = rotation.lastFreshDay(bank);
const runway = Math.max(lastFresh - today + 1, 0);
const sizes = rotation.ARC.map((r) => `${r} ${bank[r].length}`).join(' · ');

console.log(`Today: Daily #${today} (${rotation.todayET()})`);
console.log(`Bank:  ${sizes}`);
console.log(`Fresh verses through Daily #${lastFresh} (${rotation.dateOf(lastFresh)}) — ${runway} day(s) left`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `runway=${runway}\nlast_fresh=${rotation.dateOf(lastFresh)}\n`);
}
const i = process.argv.indexOf('--min');
if (i > -1 && runway < Number(process.argv[i + 1])) process.exit(2);
