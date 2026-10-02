# Architecture

How the app is put together and why. For the rules to follow when changing code see
[AGENTS.md](../AGENTS.md).

## Principles

1. **The data never leaves the page.** No request carries file contents, and every script,
   worker and `.wasm` file is served from the site itself.
2. **The landing page is light.** DuckDB and SheetJS are loaded only when a file is on its way.
3. **The main thread only draws.** Parsing, inference and export run in web workers.
4. **Nothing is reinterpreted silently.** The file is read as text and types are applied on top,
   where the user can see and change them.

## Flow

```
file ──► xlsx worker (XLSX only) ──► CSV bytes ─┐
file ───────────────────────────────────────────┴─► DuckDB: raw table (all VARCHAR)
                                                       │
                              preview (50 rows) ◄──────┤
                              inferred types    ◄──────┤
                              validation        ◄──────┤
                                                       ▼
                                 COPY (SELECT casts) TO parquet ──► download
```

## Client code

There is one entry point, `src/lib/client.ts`, imported from `BaseLayout.astro`. It handles the
theme toggle and calls `initConverter()`.

The markup is static: Astro components render every section, hidden until there is data.
Elements are found through data attributes, so the scripts never depend on class names.

| Attribute                              | Role                                             |
| -------------------------------------- | ------------------------------------------------ |
| `data-converter`                       | Root; gets `data-busy` and `data-loaded`         |
| `data-dropzone`, `data-file-input`     | Drag and drop target and file picker             |
| `data-sample`                          | Button that loads a sample file from its URL     |
| `data-status`, `data-alert`            | Progress line and error box                      |
| `data-workspace`                       | Everything shown once a file is loaded           |
| `data-sheet-picker`, `data-sheet-select` | Sheet selector of a workbook                   |
| `data-stat`                            | Stat tile (`rows`, `columns`, `original`, `parquet`) |
| `data-schema-body`, `data-type-select` | Column types table and its selects               |
| `data-preview`                         | Preview table                                    |
| `data-download`, `data-result`         | Export button and its outcome                    |
| `data-reset`                           | Removes the current file                         |
| `data-busy-lock`                       | Disabled while a task is running                 |

`src/lib/converter/` holds the three parts of the UI logic:

- `state.ts` — the current source, row count, columns and preview rows.
- `render.ts` — writes state to the DOM. Cell values go in through `textContent`, never as HTML.
- `controller.ts` — listens to events and runs the pipeline. Every operation goes through `task()`,
  which sets the busy state, shows the status line, reports errors and ignores results that arrive
  after a newer operation started (each task carries a run number).

## DuckDB

`src/lib/duckdb/client.ts` exposes `getEngine()`, a lazy singleton. The first call imports
`@duckdb/duckdb-wasm`, picks the `eh` or `mvp` bundle with `selectBundle()` and starts the worker.
The bundle files are imported with Vite's `?url` suffix, so they are emitted as hashed assets under
`_astro/` and resolved correctly under any base path. The package is excluded from
`optimizeDeps`, since pre-bundling would break those asset references in development. The
single-threaded bundles are used, so the site needs no cross-origin isolation headers, which
GitHub Pages cannot set.

The engine is warmed up when the pointer enters the dropzone, so it is usually ready by the time
a file is dropped.

### Ingest (`ingest.ts`)

A CSV is registered as a file handle and read in place; a sheet arrives as CSV bytes from the
xlsx worker. Both become the `raw` table through
`read_csv(..., all_varchar = true, header = true, null_padding = true)`. The delimiter and quoting
are sniffed by DuckDB. If reading fails on encoding, it is retried as Latin-1, which is what Excel
often writes on Windows.

### Types (`sql.ts`, `infer.ts`)

`sql.ts` is the only place that knows how a type maps to SQL:

- `castExpr(column, type)` — the expression used in the export.
- `matchExpr(column, type)` — the stricter test used for detection.
- `failsExpr(column, type)` — true for a non-empty value that the cast turns into null.

| Type    | Parquet type | Detected when every value…                                         |
| ------- | ------------ | ------------------------------------------------------------------ |
| Integer | `BIGINT`     | is digits with no leading zero and fits 64 bits                    |
| Decimal | `DOUBLE`     | is a dot decimal, or a comma decimal with optional dot thousands   |
| Boolean | `BOOLEAN`    | is `true`, `false`, `yes` or `no`                                  |
| Date    | `DATE`       | parses as a day-first or ISO date                                  |
| Text    | `VARCHAR`    | otherwise                                                          |

Detection is one aggregate query that counts, per column, the non-empty values and how many match
each candidate; the first candidate matching all of them wins. Empty cells become nulls and do not
count. A forced type is more lenient than detection (a forced boolean also accepts `1`, `0`, `si`),
and `findIssue()` reports how many values would be lost, with a few examples.

### Export (`export.ts`)

`failingColumns()` checks every typed column in one query. If any fails, the export stops and the
offending columns are flagged. Otherwise `COPY (SELECT casts FROM raw) TO 'output-N.parquet'
(FORMAT parquet, COMPRESSION zstd)` writes into DuckDB's virtual file system, the file is read
back to confirm the row count, copied out as bytes and offered as a download. Each export uses a
new file name because DuckDB keeps metadata of a Parquet file it has already read under that name.

## XLSX

`src/lib/xlsx/xlsx.worker.ts` runs SheetJS off the main thread. It opens the workbook once, reports
the sheets with their row counts and, on request, turns one sheet into CSV:

- date cells become ISO dates (`yyyy-mm-dd`), from the serial number, so no time zone is involved;
- numbers are written raw, except cells formatted as zero-padded codes (`000`), which keep their
  displayed text;
- text cells are passed through untouched, so text dates and comma decimals reach the same
  inference as in a CSV;
- fully empty rows are skipped.

`client.ts` wraps the worker in promises and terminates it when the file is removed.

## Styling

Tailwind CSS v4, configured in `src/styles/index.css`: raw colours are CSS variables on `:root`,
redefined for the dark theme and exposed with `@theme inline` (`bg-bg`, `text-muted`,
`border-line`, `text-accent`, `text-danger`…). Shared classes (`.wrap`, `.card`, `.btn`, `.chip`,
`.select`, `.dropzone`, `.data-table`, `.alert`) live in the components layer; one-off layout stays
in utility classes.

The theme is the `data-theme` attribute on `<html>`, set before first paint by an inline script
(stored choice, else the system preference).

## SEO

`components/seo/SEO.astro` emits the title, description, canonical URL, `robots`, Open Graph and
Twitter tags, plus the Google verification tag when `SITE.googleSiteVerification` is set.
`lib/seo.ts` builds absolute URLs (`absUrl()`, which honours the base path) and the
`WebApplication` JSON-LD object.
`@astrojs/sitemap` writes the sitemap and `pages/robots.txt.ts` points to it. The 404 page is
`noindex` and left out of the sitemap.

## Build and deploy

`npm run build` writes static HTML to `dist/`. `astro.config.mjs` reads `SITE_URL` and `BASE_PATH`
from the environment, and every internal URL goes through `withBase()` (`src/lib/paths.ts`), so
the same build works at a domain root or under `/<repository>/`. The GitHub Actions workflow feeds
both values from `actions/configure-pages`.
