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

  // /play — the daily game. The bank is injected raw (it's JSON, not HTML), so
  // this page bypasses render() and its HTML-escaping on purpose.
  const playTpl = fs.readFileSync(path.join(ROOT, 'goodword', 'play-template.html'), 'utf8');
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'goodword', 'daily-bank.json'), 'utf8'));
  const ARC = ['Cold Open', 'Recovery Grace', 'Middle Test', 'Deep Water', 'Pulpit Ready'];
  for (const role of ARC) {
    if (!Array.isArray(bank[role]) || bank[role].length < 1) {
      throw new Error(`daily-bank.json: pool "${role}" is missing or empty`);
    }
  }
  const GWG_EPOCH = '2026-07-14'; // Daily #1, Eastern time
  pages.push(writePage('goodword/play', playTpl
    .replace('__GWG_BANK__', JSON.stringify(bank, null, 2))
    .replace('__GWG_EPOCH__', GWG_EPOCH)));

  // /plus — static coming-soon page
  const plusTpl = fs.readFileSync(path.join(ROOT, 'goodword', 'plus-template.html'), 'utf8');
  pages.push(writePage('goodword/plus', plusTpl));

  return pages;
}

// ---------------------------------------------------------------- main

fs.rmSync(DIST, { recursive: true, force: true });
const stocksense = buildStockSense();
const goodword = buildGoodWord();
console.log(`StockSense: ${stocksense.length} pages`);
console.log(`Good Word:  ${goodword.length} pages`);
console.log(`Total:      ${stocksense.length + goodword.length} pages → ${path.relative(process.cwd(), DIST)}/`);
