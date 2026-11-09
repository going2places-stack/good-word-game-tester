# The Good Word Game

Source for **thegoodwordgame.com** — a daily KJV fill-in-the-blank game plus 66 book
pages and category pages. (The repo name is historical: it started as a private tester build.)

- **Build:** `cd content-pages && node build.js` → `content-pages/dist/goodword/` (Vercel project
  `the-good-word-game` serves that folder). Zero dependencies, Node 18+.
- **Daily game:** `content-pages/goodword/play-template.html` + `daily-bank.json` (5 pools).
  Epoch and rotation constants (`GWG_EPOCH`, `GWG_REBASE`) live in `content-pages/build.js`.
- **Bank top-ups:** append to each pool, set `GWG_REBASE` to the day after deploy with
  `index` = the old pool length, then verify:
  `cd content-pages/tools && npm install && node verify-bank.mjs`
- **SEO:** the build also writes `sitemap.xml`, `robots.txt` and `404.html`.
- `index.html` at the repo root is the original June tester build (not deployed).
- `content-pages/stocksense/` is StockSense's content pages — a separate product that shares
  this generator for now and is not deployed by this project.
