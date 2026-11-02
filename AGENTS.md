# AGENTS.md

## Architecture

```text
content/post/**/*.md
  -> content.gleam (split, decode, validate, render Markdown)
  -> pipeline.gleam (sort, neighbours, tag groups, routes, HTML)
  -> rss.gleam
  -> build.gleam (output plan and staging orchestration)
  -> runtime_ffi.mjs (filesystem effects)
  -> dist/
```

The application targets JavaScript and runs under Bun. Gleam owns application
models, validation, sorting, grouping, templates, HTML/RSS composition, build
sequencing, and output decisions. JavaScript adapters provide runtime and library
primitives; do not move application policy back into adapters.

## Commands

Requires Gleam 1.19.2 and Bun 1.3.14 (the versions tested and pinned in CI).

- `bun install --frozen-lockfile` — install JS libraries
- `bun run build` — Gleam production build into `dist/`
- `bun run dev` / `bun run serve` — initial build, HTTP server on port 3000, watcher and SSE reload
- `PORT=4000 bun run dev` — choose another port
- `bun run test` — compile Gleam and run Bun unit/integration tests
- `bun run check` — Gleam formatting/type checks and Biome checks for JS/JSON
- `bun run format` — Gleam formatter plus Prettier for other supported sources

Drafts are hidden by default in both build and dev. Use `INCLUDE_DRAFTS=1 bun run
dev` (or `build`) to explicitly include them. Only the exact value `1` enables
preview; `NODE_ENV` does not affect draft visibility. Do not enable preview in CI.

## Files

| File | Responsibility |
| --- | --- |
| `src/revlogi_blog.gleam` | Build CLI entry point and exit status |
| `src/config.gleam` | Site configuration |
| `src/content.gleam` | Frontmatter split, strict metadata validation, source-path diagnostics, parsed posts |
| `src/slug.gleam` | Pure normalized post-relative path to slug |
| `src/post_order.gleam` | Generic stable sorting and neighbour traversal |
| `src/template.gleam` | Pure single-pass substitution with structured errors |
| `src/page.gleam` | Post view models, article composition, site layout/navigation |
| `src/listing.gleam` | Shared post-list item, homepage, tag page/index |
| `src/static_pages.gleam` | About/Friends/Links |
| `src/pipeline.gleam` | Complete HTML URL map and first-seen tag grouping |
| `src/rss.gleam` | RSS data preparation, XML escaping, sorting and template composition |
| `src/build.gleam` | Template loading, render plan, staging/output orchestration |
| `src/runtime.gleam` | Typed FFI declarations |
| `src/runtime_ffi.mjs` | YAML/date/Markdown bridges and filesystem primitives |
| `src/markdown.mjs` | Markdown-it, KaTeX, Shiki initialization/rendering |
| `src/dev.gleam` | Dev entry point, watch filtering and MIME policies |
| `src/server.mjs` | Bun HTTP, filesystem watchers, serialized child builds and SSE |
| `src/ssg/templates/` | HTML/XML markup, including `rss.xml` and `rss-item.xml` |
| `src/ssg/styles/global.css` | Global styles |
| `tests/` | Bun tests against compiled Gleam and runtime boundaries |

## Contracts

- Required frontmatter: nonblank string `title`, parseable string `publishDate`.
- Optional `description` and `tag`: strings, default empty; wrong types are errors.
- Optional `draft`: boolean, default false; quoted strings/numbers/null are errors.
- Invalid metadata stops the build and identifies the source file, including for
  hidden drafts. Filter validated posts once in `build.render_site()` before
  sorting, neighbours, tag groups/counts, page rendering and RSS so every generated
  view uses the same publication set. Staged replacement removes stale draft pages.
- Dates retain the JS runtime parser/formatting behavior for compatibility with
  existing human-readable dates. Date-only strings without a timezone can depend
  on the environment; prefer explicit ISO timestamps when timezone stability matters.
- Keep HTML/XML markup in `src/ssg/templates/`, not in Gleam string concatenation.
  RSS uses a feed template and an item template; its renderer escapes text values
  before substitution and propagates template errors before output is emitted.
- Templates are loaded on each build. Values are inserted verbatim, including
  rendered HTML. Only `{{ASCII_word_key}}` placeholders match. Replacement is
  single-pass; missing values return errors. Escaping metadata would be a separate
  behavior change, not an incidental migration fix.
- Sorting is newest first and stable for ties. Neighbours use `Option`.
- Tag groups retain first-seen tag order and sorted post order within each group.
- Duplicate URL keys keep last-write-wins behavior. Dictionary iteration order is
  not meaningful.
- Validate/render everything before emitting. Write to a staging directory;
  commit only when pages/assets/RSS succeed, restoring the previous directory if
  the replacement rename fails. This is not a crash-atomic transaction.
- The dev adapter serializes rebuilds and invokes a fresh Gleam build so generator
  edits take effect. Restart the dev command after editing the dev-server adapter
  or its watch/MIME policies. Do not run independent builds concurrently against
  the same `dist/`.
- Preserve templates/CSS/content outside the selected task. No JSX, component tree,
  or third-party template engine is needed.
