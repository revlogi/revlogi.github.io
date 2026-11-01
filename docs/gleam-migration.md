# TypeScript → Gleam migration

## Status

The production build and dev commands now run Gleam targeting JavaScript under
Bun. The old TypeScript implementation, experimental project, and TypeScript-only
dependencies have been removed. HTML templates, styles, content, and public assets
were retained.

Before switching implementations, the original build output was saved locally.
The new output was compared recursively against it: all 17 HTML pages, RSS, CSS,
and public assets were byte-for-byte identical. That local baseline is not a
repository fixture; durable tests cover the contracts below without depending on
an obsolete TypeScript implementation.

CI builds the new application. The workflow was updated locally; a remote GitHub
Actions run/deployment is not performed by this migration.

## Read the code in this order

1. **`src/build.gleam`** — starts with source posts, loads templates, constructs the
   full output map, then stages and commits it. `render_site()` can produce the
   entire plan in memory without writing output.
2. **`src/content.gleam`** — separates frontmatter/body, decodes YAML values into
   typed metadata, validates required fields, and retains the source path.
3. **`src/pipeline.gleam`** — stable sorting, neighbours, tag grouping, route
   construction, and all HTML pages.
4. **`src/page.gleam` / `src/listing.gleam`** — article and list composition. A post
   view is data; the templates specify its HTML structure.
5. **`src/template.gleam`** — single-pass substitution. Replacement values enter an
   output accumulator, never the remaining input, so inserted `{{...}}` stays literal.
6. **`src/rss.gleam`** — XML escaping, sorting, and composition using
   `src/ssg/templates/rss.xml` and `rss-item.xml`. Markup stays in templates;
   renderers receive their source strings and return structured template errors.
7. **`src/runtime.gleam` / `src/runtime_ffi.mjs`** — typed declarations and JS effects.
8. **`src/dev.gleam` / `src/server.mjs`** — initial build, watcher policy, HTTP/SSE,
   and serialized fresh-process rebuilds.

## One real post

```text
content/post/y-combinator.md
  file path -> slug "y-combinator"
  YAML      -> title "Recursion without names", date, tag, description
  Markdown  -> article HTML
      -> PostView inside Article with epoch timestamp
      -> post template (title/date/tag/body/neighbours)
      -> site layout (head/navigation/document)
      -> URL /posts/y-combinator/
      -> staged posts/y-combinator/index.html
      -> dist/posts/y-combinator/index.html
```

Changing the title does not change its URL. The same article also feeds the home
list, tag page, neighbour links, and RSS. Changing only its Markdown body does not
change the home list because summaries use metadata, not article HTML.

## Decisions preserved

- Reuse Markdown-it, KaTeX, Shiki dual themes, footnotes, anchors, and YAML through
  small JS bridges. No Markdown parser/highlighter rewrite was necessary.
- Gleam owns application decisions; JS supplies effects and existing libraries.
- Pure page renderers receive template source strings, prepared date strings, and
  explicit configuration. They do not read files.
- Sorting is stable, newest first. Generic ordering functions keep complete payloads;
  they do not recover articles by slug after sorting.
- Missing neighbours use `None`; present ones use `Some(post)`.
- Empty description/tag fragments are skipped. Explicitly empty page descriptions
  differ from missing descriptions (`Some("")` versus `None`).
- Tag groups preserve first-seen tag order and post order. Equal-count tags retain
  insertion order, rather than becoming alphabetically sorted.
- Template keys follow the original ASCII-word syntax. Values are inserted verbatim,
  replacements happen once, and missing keys carry template/key error information.
- Duplicate routes retain Map-style last-write-wins semantics. Rejecting duplicate
  slugs/routes would be a separate feature.
- Hidden public files are skipped, matching the original scanner. Public assets
  are copied after HTML, styles afterward, and generated RSS last.
- Unknown metadata fields, including `draft`, are ignored. The original repository
  instructions claimed draft filtering, but the implementation never had it.

## Intentional changes agreed during the walkthrough

### Strict metadata

A title must be a nonblank string. `publishDate` must be a string accepted by the
runtime date parser. Description/tag are optional strings defaulting to empty;
nulls and wrong types are errors rather than coerced strings. Unknown fields are
ignored. A failure stops the build and identifies the source file.

This replaces the old empty-title fallback and nondeterministic current-time
fallback for missing dates. Existing valid posts retain their output. JS date
parsing/formatting is deliberately retained, including human-readable date strings
and environment-dependent handling of dates without explicit timezones; it is not
a newly specified strict calendar grammar.

### Safer output

All posts and pages are validated/rendered before filesystem emission. The emitter
writes pages, assets, styles, and RSS to a same-filesystem staging directory. Only
then does it move the previous `dist/` aside and rename the staging directory into
place. A failed rename attempts to restore the previous output; failed earlier
writes clean the stage without touching it. A restore failure names the retained
backup path. Cleanup failure after a successful commit is a warning.

This is rollback-oriented replacement, not a crash-atomic directory transaction.
The dev server serializes rebuilds; independent build commands must not run
concurrently against the same output directory. Output paths are checked against
the stage boundary to prevent tag/path traversal from writing outside it.

### Development tooling

Runtime primitives stay in JS, while watch filters/MIME policy and initial build
sequencing live in Gleam. Each subsequent rebuild invokes a fresh Gleam process,
so generator code is actually recompiled/reloaded. Changes to the dev-server
adapter or its watch/MIME policies require restarting the dev command. Successful
builds notify browsers through SSE; failed builds do not reload them. HTTP serving
handles clean URLs, MIME types, 404s, and rejects output-directory escapes.

## Verification

```sh
bun install --frozen-lockfile
bun run check
bun run test
bun run build
```

Tests exercise compiled Gleam, not a JS reimplementation of the domain logic:

- Slugs, nested indices, Unicode/case, and the legacy root-index `post` slug.
- Placeholder syntax, literal HTML, single-pass replacement, missing keys and values.
- Strict metadata, defaults, CRLF splitting, dates and source-file errors.
- Stable sorting, empty/singleton blogs, neighbours, first-seen tag grouping.
- Complete pages, optional fragments, duplicate routes and propagated errors.
- XML escaping/feed order and Markdown extensions/highlighting fallback.
- Clean-URL emission, assets/styles/RSS, staged failure recovery and path safety.
- Dev HTTP, source watching, SSE notifications and failed rebuild preservation.

Integration tests create temporary sites and clean them up; they do not mutate
real posts, templates, or the site's existing output.

## Follow-ups, not blockers

- Distinguish escaped metadata text from intentional HTML; current verbatim template
  behavior is preserved, including its trust assumptions.
- Consider explicit timezone/date-format rules if cross-environment determinism is
  required beyond compatibility with the original runtime behavior.
- Consider duplicate-route validation, draft support, or stronger crash/concurrent
  build guarantees as deliberate features with separate tests.
