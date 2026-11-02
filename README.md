# RevLogi’s blog

A small static blog inspired by [matklad](https://github.com/matklad/matklad.github.io).
The generator is written in Gleam, targeting JavaScript and running under Bun.
Markdown-it, KaTeX, Shiki, and YAML remain behind JavaScript adapters.

## Run

Install Gleam and Bun (tested with Gleam **1.19.2**, Bun **1.3.14**):

```sh
brew install gleam
bun install --frozen-lockfile
bun run build       # dist/
bun run dev         # http://localhost:3000, rebuild + browser reload
```

Homebrew also installs Erlang dependencies for Gleam; this application uses the
JavaScript target, not the Erlang runtime. CI installs the same Gleam/Bun versions.

```sh
bun run check
bun run test
PORT=4000 bun run dev
```

The tests compile Gleam first. Integration tests use temporary sites and check
output, failure recovery, HTTP serving, watching, and SSE reload.

## Write a post

Create `content/post/example.md`:

```markdown
---
title: "An example"
publishDate: "6 July 2026"
description: "Optional summary"
tag: computation
---

## Content

Write Markdown here.
```

The path determines `/posts/example/`, not the title. Nested `index.md` files use
their containing directory as the slug. Titles and dates are required; optional
summary/tag fields must be strings if supplied. Invalid metadata stops the build
with a source-file diagnostic and leaves the previous output untouched.

## Drafts

Add an unquoted boolean to an unfinished post's frontmatter:

```yaml
draft: true
```

Missing `draft` defaults to `false`. Both `build` and `dev` hide drafts by default:
no article page, homepage entry, tag entry/count, RSS item, or neighbour link is
created. A normal rebuild also removes any draft pages left by a preview build.
Draft metadata must still pass validation, including its title and date.

Explicitly include drafts for local preview:

```sh
INCLUDE_DRAFTS=1 bun run dev
# Or generate a preview build:
INCLUDE_DRAFTS=1 bun run build
```

Only the exact value `1` enables preview; `NODE_ENV` does not affect visibility.
To publish, remove `draft: true` or change it to `draft: false`. Draft Markdown
remains in the repository; this is a publication switch, not privacy protection.

## Architecture

```text
Markdown -> validated posts -> sorting/neighbours/tag groups
         -> HTML templates + RSS -> staged output -> dist/
```

Gleam owns these transformations and their sequencing. Runtime adapters provide
filesystem access, Markdown/YAML libraries, date conversion, HTTP/watch primitives,
and process spawning. Development rebuilds run in fresh processes so generator
edits are compiled before reload. Failed rebuilds retain the previously built site.
Restart the dev command after changing the server adapter or watch/MIME policies.

Start reading at `src/build.gleam`, then `src/content.gleam` and
`src/pipeline.gleam`. The original HTML templates and CSS remain under `src/ssg/`.
See [the migration guide](docs/gleam-migration.md) for decisions and learning notes.
