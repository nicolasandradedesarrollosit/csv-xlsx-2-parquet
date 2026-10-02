## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

## Project conventions

See `README.md` for an overview and `docs/ARCHITECTURE.md` for how the pieces fit. Keep them up to date when behaviour changes.

- CSV/XLSX to Parquet converter that runs entirely in the browser. Code, copy and docs in English.
- No comments in source files: explanations live in `docs/`. The only exception is the `// @ts-check` directive in `astro.config.mjs`.
- `npm run check` is the lint step. Run it and `npm run build` before committing.
- Commits follow Conventional Commits with a lowercase imperative subject and an optional scope (`feat(export): …`).

### Privacy

- File contents never leave the page. Do not add analytics, remote fonts, CDN scripts or any request that carries user data.
- DuckDB bundles and the SheetJS worker are served from the site. Do not load DuckDB extensions at runtime.

### Client code

- One entry, `src/lib/client.ts`. Behaviour is attached through data attributes (table in `docs/ARCHITECTURE.md`), never through class names.
- Heavy work stays off the main thread: SQL in the DuckDB worker, workbook parsing in `src/lib/xlsx/xlsx.worker.ts`.
- DuckDB and SheetJS are imported dynamically. Never import them from a module that the landing page loads eagerly.
- Every operation in `controller.ts` goes through `task()`, so busy state, status and errors are handled in one place.
- Render user data with `textContent`. Never build HTML strings from file contents.
- Errors shown to the user are `ConverterError`s: a short message plus an optional detail.

### SQL

- Type mapping lives only in `src/lib/duckdb/sql.ts` (`castExpr`, `matchExpr`, `failsExpr`). A new type or format is added there.
- Column names come from user files: always go through `ident()`; string values through `literal()`.
- The `raw` table is all text. Never let DuckDB infer types on ingest.

### Styling

- Tailwind CSS v4: tokens, light/dark colours and shared classes in `src/styles/index.css`; utilities for one-off layout.
- Always use the colour tokens (`bg-bg`, `text-muted`, `border-line`…), never raw colours.
- Internal URLs go through `withBase()` so the site works under a GitHub Pages project path.
