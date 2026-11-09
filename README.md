# The Good Word Game

Source for **thegoodwordgame.com** — a daily KJV fill-in-the-blank game plus 66 book
pages and category pages. (The repo name is historical: it started as a private tester build.)

- **Build:** `cd content-pages && node build.js` → `content-pages/dist/goodword/` (Vercel project
  `the-good-word-game` serves that folder). Zero dependencies, Node 18+.
- **Daily game:** `content-pages/goodword/play-template.html` loads today's five verses from
  `/daily/<n>.json`, which the build generates from `daily-bank.json` (5 pools) using the
  rotation in `content-pages/goodword/rotation.js` (epoch, rebase, runway).
- **Bank top-ups:** append verified questions to each pool and merge — leave `REBASE` alone; the
  rotation reaches new questions by itself as long as you top up before the runway ends. Verify:
  `cd content-pages/tools && npm install && node verify-bank.mjs`. Check runway any time with
  `node content-pages/tools/check-runway.mjs`; a monthly GitHub Action opens an issue when fewer
  than 60 days of fresh verses remain.
- **SEO:** the build also writes `sitemap.xml`, `robots.txt` and `404.html`.
- `index.html` at the repo root is the original June tester build (not deployed).
- `content-pages/stocksense/` is StockSense's content pages — a separate product that shares
  this generator for now and is not deployed by this project.
