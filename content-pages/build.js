#!/usr/bin/env node
/**
 * Static-site generator for the CPH content page templates.
 *
 * - StockSense Learn:  dist/stocksense/learn/<slug>/index.html  (8 pages + /learn index)
 * - Good Word Game:    dist/goodword/books/<slug>/index.html    (66 pages)
 *                      dist/goodword/difficulty|testament/<slug>/index.html (5 category pages)
 *
 * No dependencies. Templates use {{path.to.value}} placeholders and
 * <!-- {{#each path}} --> ... <!-- {{/each}} --> repeat blocks (nesting supported).
 * All values are HTML-escaped on output.
 *
 * Usage: node build.js  (writes to ./dist)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const rotation = require('./goodword/rotation');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// ---------------------------------------------------------------- rendering

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lookup(ctx, expr) {
  if (expr === 'this') return ctx.this !== undefined ? ctx.this : ctx;
  let cur = ctx;
  for (const key of expr.split('.')) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

const EACH_OPEN = /<!--\s*\{\{#each\s+([\w.]+)\}\}\s*-->/;
const EACH_ANY = /<!--\s*\{\{(#each\s+[\w.]+|\/each)\}\}\s*-->/g;

function render(template, ctx) {
  let out = template;
  let m;
  while ((m = out.match(EACH_OPEN))) {
    const blockStart = m.index;
    const innerStart = blockStart + m[0].length;
    // find the matching {{/each}}, respecting nested blocks
    EACH_ANY.lastIndex = innerStart;
    let depth = 1, mm, endStart = -1, endEnd = -1;
    while ((mm = EACH_ANY.exec(out))) {
      if (mm[1].startsWith('#each')) depth++;
      else depth--;
      if (depth === 0) { endStart = mm.index; endEnd = EACH_ANY.lastIndex; break; }
    }
    if (endStart === -1) throw new Error(`Unclosed {{#each ${m[1]}}} block`);
    const inner = out.slice(innerStart, endStart);
    const items = lookup(ctx, m[1]) || [];
    const rendered = items
      .map((item) => {
        const child = (item !== null && typeof item === 'object')
          ? Object.assign({}, ctx, item, { this: item })
          : Object.assign({}, ctx, { this: item });
        return render(inner, child);
      })
      .join('');
    out = out.slice(0, blockStart) + rendered + out.slice(endEnd);
  }
  return out.replace(/\{\{([\w.]+)\}\}/g, (_, expr) => {
    const v = lookup(ctx, expr);
    if (v === undefined || v === null) throw new Error(`Missing value for {{${expr}}}`);
    return escapeHtml(v);
  });
}

function writePage(relPath, html) {
  const file = path.join(DIST, relPath, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return relPath + '/';
}

// ---------------------------------------------------------------- StockSense

function buildStockSense() {
  const tpl = fs.readFileSync(path.join(ROOT, 'stocksense', 'template.html'), 'utf8');
  const indexTpl = fs.readFileSync(path.join(ROOT, 'stocksense', 'index-template.html'), 'utf8');
  const { checks } = JSON.parse(fs.readFileSync(path.join(ROOT, 'stocksense', 'content-data.json'), 'utf8'));

  const byNumber = [...checks].sort((a, b) => a.checkNumber - b.checkNumber);
  const pages = [];

  for (const check of checks) {
    if (!check.explanation.sections.length || !check.example.companies.length) {
      throw new Error(`StockSense check "${check.slug}" is missing drafted content`);
    }
    const siblings = byNumber.filter((c) => c.slug !== check.slug);
    pages.push(writePage(`stocksense/learn/${check.slug}`, render(tpl, { ...check, siblings })));
  }
  pages.push(writePage('stocksense/learn', render(indexTpl, { checks: byNumber })));
  return pages;
}

// ---------------------------------------------------------------- Good Word

function slugifyCategoryValue(v) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * 4 curated related books: prefer same difficulty + same testament, then same
 * testament, then same difficulty — nearest in canonical order first.
 */
function siblingBooks(book, books) {
  const idx = books.indexOf(book);
  return books
    .map((other, i) => ({ other, i }))
    .filter(({ other }) => other.slug !== book.slug)
    .map(({ other, i }) => ({
      other,
      score:
        (other.difficulty === book.difficulty ? 2 : 0) +
        (other.testament === book.testament ? 1 : 0),
      dist: Math.abs(i - idx),
    }))
    .sort((a, b) => b.score - a.score || a.dist - b.dist)
    .slice(0, 4)
    .map(({ other }) => other);
}

// Must match the canonical/og:url host hardcoded in the goodword templates.
const SITE_URL = 'https://www.thegoodwordgame.com';

function buildGoodWord() {
  const tpl = fs.readFileSync(path.join(ROOT, 'goodword', 'template.html'), 'utf8');
  const catTpl = fs.readFileSync(path.join(ROOT, 'goodword', 'category-template.html'), 'utf8');
  const indexTpl = fs.readFileSync(path.join(ROOT, 'goodword', 'index-template.html'), 'utf8');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'goodword', 'content-data.json'), 'utf8'));
  const { books, categoryPages } = data;
  const pages = [];

  for (const book of books) {
    const v = book.sampleVerse;
    if (!v) throw new Error(`Book "${book.slug}" is missing its sampleVerse`);
    if (!/^[a-z]+$/.test(v.answer)) {
      throw new Error(`Book "${book.slug}" answer must be a single lowercase word: "${v.answer}"`);
    }
    if (!book.didYouKnow || book.didYouKnow.length < 3) {
      throw new Error(`Book "${book.slug}" needs 3-4 didYouKnow facts`);
    }
    pages.push(writePage(`goodword/books/${book.slug}`, render(tpl, { ...book, siblingBooks: siblingBooks(book, books) })));
  }

  for (const cat of categoryPages) {
    const matching = books.filter((b) => b[cat.filter] === cat.value);
    if (!matching.length) throw new Error(`Category "${cat.slug}" matches no books`);
    const siblingCategories = categoryPages.filter((c) => c.slug !== cat.slug);
    pages.push(writePage(`goodword/${cat.slug}`, render(catTpl, {
      ...cat,
      count: matching.length,
      books: matching,
      siblingCategories,
    })));
  }

  const featuredSlugs = ['genesis', 'psalms', 'matthew', 'john', 'proverbs', 'romans'];
  const featuredBooks = featuredSlugs
    .map((s) => books.find((b) => b.slug === s))
    .filter(Boolean);
  const difficultyCategories = categoryPages.filter((c) => c.filter === 'difficulty');
  const testamentCategories = categoryPages.filter((c) => c.filter === 'testament');
  pages.push(writePage('goodword', render(indexTpl, {
    bookCount: String(books.length),
    featuredBooks,
    difficultyCategories,
    testamentCategories,
  })));

  // /play — the daily game. The page itself carries no questions: build.js runs the
  // rotation (goodword/rotation.js) and writes each day's five verses to
  // /daily/<n>.json, so the page stays small however big the bank grows.
  const playTpl = fs.readFileSync(path.join(ROOT, 'goodword', 'play-template.html'), 'utf8');
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'goodword', 'daily-bank.json'), 'utf8'));
  rotation.validate(bank);
  const today = rotation.dayOf(rotation.todayET());
  const lastFresh = rotation.lastFreshDay(bank);
  const runway = lastFresh - today + 1;
  console.log(`Daily bank: ${rotation.ARC.map((r) => bank[r].length).join('/')} per pool · today Daily #${today} · ` +
    `fresh verses through Daily #${lastFresh} (${rotation.dateOf(lastFresh)})` +
    (runway < 60 ? ` · ⚠ only ${Math.max(runway, 0)} fresh day(s) left — top up the bank` : ` · ${runway} days`));
  // a week back (clock skew) through well past the fresh runway, so the site never
  // runs out of day files even if nobody deploys for a long while
  const lastFile = Math.max(lastFresh, today) + 400;
  const dailyDir = path.join(DIST, 'goodword', 'daily');
  fs.mkdirSync(dailyDir, { recursive: true });
  for (let d = Math.max(1, today - 7); d <= lastFile; d++) {
    fs.writeFileSync(path.join(dailyDir, `${d}.json`), JSON.stringify(rotation.questionsFor(bank, d)));
  }
  pages.push(writePage('goodword/play', playTpl.replace('__GWG_EPOCH__', rotation.EPOCH)));

  // /plus — static coming-soon page
  const plusTpl = fs.readFileSync(path.join(ROOT, 'goodword', 'plus-template.html'), 'utf8');
  pages.push(writePage('goodword/plus', plusTpl));

  // /privacy — static policy page
  const privacyTpl = fs.readFileSync(path.join(ROOT, 'goodword', 'privacy-template.html'), 'utf8');
  pages.push(writePage('goodword/privacy', privacyTpl));

  // 404.html — Vercel serves this for unknown paths (not a crawlable page, so not in `pages`)
  fs.copyFileSync(path.join(ROOT, 'goodword', '404-template.html'), path.join(DIST, 'goodword', '404.html'));

  // robots.txt + sitemap.xml — URLs match each page's <link rel="canonical"> exactly
  // (no trailing slash except the homepage)
  const urls = pages.map((p) => SITE_URL + ('/' + p.replace(/^goodword\/?/, '')).replace(/(.)\/$/, '$1'));
  fs.writeFileSync(path.join(DIST, 'goodword', 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>\n`).join('') + '</urlset>\n');
  fs.writeFileSync(path.join(DIST, 'goodword', 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  // static assets (favicon, touch icon, og image) — dist is wiped every build,
  // so these must be copied from source or the site loses its icons
  const assetsDir = path.join(ROOT, 'goodword', 'assets');
  for (const f of fs.readdirSync(assetsDir)) {
    fs.copyFileSync(path.join(assetsDir, f), path.join(DIST, 'goodword', f));
  }

  return pages;
}

// ---------------------------------------------------------------- main

fs.rmSync(DIST, { recursive: true, force: true });
const stocksense = buildStockSense();
const goodword = buildGoodWord();
console.log(`StockSense: ${stocksense.length} pages`);
console.log(`Good Word:  ${goodword.length} pages`);
console.log(`Total:      ${stocksense.length + goodword.length} pages → ${path.relative(process.cwd(), DIST)}/`);
