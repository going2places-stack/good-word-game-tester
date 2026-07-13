# CPH Content Pages — Static Site Generator

SEO content pages for two Colin Pierce Holdings products, generated from the
handoff templates (`StockSense_and_Good_Word_Game_Templates.zip`).

## Build

```
node build.js
```

No dependencies (Node 18+). Output goes to `dist/`:

| Deploy root | Pages |
|---|---|
| `dist/stocksense/` | 8 check pages at `/learn/<slug>/` + a `/learn/` index (the site footer links to it) |
| `dist/goodword/` | 66 book pages at `/books/<slug>/` + 5 category pages at `/difficulty/<slug>/` and `/testament/<slug>/` |

Each deploy root is a separate site — internal links are root-relative
(`/learn/...`, `/books/...`, `/play`), so deploy each folder at its own
domain root/CDN. Pages are emitted as `<slug>/index.html` for clean URLs.

## Layout

```
build.js                          zero-dependency generator (mustache-style
                                  {{placeholders}} + <!-- {{#each}} --> blocks,
                                  HTML-escaped output, sibling auto-generation)
stocksense/template.html          check page template (from handoff, unmodified)
stocksense/index-template.html    /learn index page (new, same visual family)
stocksense/content-data.json      all 8 checks fully drafted
goodword/template.html            book page template (from handoff, unmodified)
goodword/category-template.html   difficulty/testament listing page (new, same visual family)
goodword/content-data.json        all 66 books + 5 category pages fully drafted
```

## Content status (drafted for Kevin's review)

- **StockSense** — P/E Ratio was the handoff's voice reference; the other 7
  checks' `explanation`/`example` content is newly drafted in the same style
  ("Picture this:" analogies, questions as headers, Company A/B only — no real
  companies named). The required educational/not-investment-advice disclaimers
  are in the template's CTA and footer on every page.
- **Good Word** — Psalms was the voice reference (kept verbatim); Genesis kept
  its given snapshot/sample verse. The other 64 books' subtitles, themes,
  sample verses (KJV), retorts, and Did-You-Know facts are newly drafted.
  **Every sample verse should be checked against the daily-rotation bank and
  the KJV text verified before launch** — the JSON *is* the teaser bank, so
  keep these verses out of the active daily rotation.

## Editorial decisions worth knowing

- **Difficulty tiers**: the handoff README listed three tiers for book pages
  but the category pages require a fourth ("Don't Play With Me"). Books use
  four tiers: Warm-Up (7), Sunday School (23), Deep Water (21),
  Don't Play With Me (15). Sunday School books are reachable via the
  testament pages (no Sunday School category page was specified).
- **Sibling books**: 4 per page, preferring same difficulty + same testament,
  then same testament, tiebreak by proximity in canonical order.
- **StockSense siblings**: all 7 other checks, ordered by check number.
- Trimmed verse excerpts adjust closing punctuation where the excerpt ends
  mid-verse; blank answers are single lowercase words to match the
  challenge widget's normalization.
