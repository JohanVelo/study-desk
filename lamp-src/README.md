# Lamp source

The deployed app is in `../lamp/` (GitHub Pages). This folder is what it's built from.

- `lamp/lamp.html` — the whole app in one file. It is also the claude.ai artifact version.
- `app/build.py` — turns `lamp.html` into the installed app (`app/dist/`): removes AI, adds sign-in (`app/src/app.js`, Supabase), service worker, icons, splash screens. Big data (Bible text `bib/`, art `art/`, Greek/Hebrew `orig/`, `bible.json`, `geo.json`, `tests.json`) is read from the deployed `../lamp/` folder, not duplicated here.
- `app/config.json` — Supabase URL and **publishable** key only. Never put the secret/service_role key anywhere.
- `app/src/schema.sql` — the Supabase tables and rules.
- `app/mkorig.py` — rebuilds `orig/` from STEPBible data (CC BY 4.0).
- `tests/` — Playwright checks (t22–t35). `t2x` tests that use port 8765 serve `lamp/`; ones on 8767 serve `app/dist/`. Port 8765 is used by QGIS on JJ's laptop, so only run those in a sandbox.
- `tools/` — scripts and data that were used to build the group studies (`gdata.js`, `gjames.js`), test sets and diagrams.

Build and deploy:

```bash
cd lamp-src/app && python3 build.py && cp -r dist/. ../../lamp/ && rm -rf dist
```
