import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { siteConfig } from "./config";
import { sortPosts } from "./date";
import { createMarkdown, parsePost } from "./parse";
import { renderIndex, renderPost } from "./render/post";
import { scanPosts } from "./scan";
import type { Post } from "./types";

// =====
// RevLogi SSG — data processing pipeline
//
//   content/*.md  →  scan  →  parse  →  render  →  emit  →  dist/*.html
//   (filesystem)  (path[])   (Post[])   (HTML str)  (disk write)
//
// Each stage is a pure data transform: takes previous stage's output,
// produces the next stage's input.
// =====

const DIST = "dist";

export async function buildAll(): Promise<number> {
	// ---- 1. SCAN -----
	// Input: content/post/**/*.md (filesystem)
	// Output: { slug, rawFrontmatter, rawBody }[]  — raw strings, unparsed
	const docs = await scanPosts();

	// ---- 2. PARSE -----
	// Input: rawFrontmatter (yaml string) + rawBody (markdown string)
	// Output: Post[] = { slug, title, publishDate, draft, html (rendered) }
	const md = await createMarkdown();
	let posts: Post[] = [];
	for (const doc of docs) {
		const post = await parsePost(doc, md);
		posts.push(post);
	}
	posts = sortPosts(posts);

	// ---- 3. RENDER -----
	// Input: Post (data object)
	// Output: Map<URL path, HTML string>  — pure functions, no side effects
	const pages = new Map<string, string>();
	pages.set("/", renderIndex(posts)); // home = flat post list
	for (const post of posts) {
		pages.set(`/posts/${post.slug}/`, renderPost(post)); // one page per post
	}

	// ---- 4. EMIT -----
	// Input: Map<URL path, HTML string>
	// Output: .html files in dist/ + static assets + CSS
	await rm(DIST, { recursive: true, force: true });
	for (const [path, html] of pages) {
		await writeHtml(path, html); // "/posts/foo/" → dist/posts/foo/index.html (clean URL)
	}
	await copyDir("public", DIST);
	await Bun.write(`${DIST}/style.css`, Bun.file("src/ssg/styles/global.css"));
	const katexCss = join("node_modules", "katex", "dist", "katex.min.css");
	if (existsSync(katexCss)) await Bun.write(`${DIST}/katex.css`, Bun.file(katexCss));

	const pageCount = pages.size;
	console.log(`✓ built ${pageCount} pages → ${DIST}/`);

	// ---- RSS -----
	await Bun.write(`${DIST}/rss.xml`, generateRssXml(posts));

	return pageCount;
}

// ---- I/O helpers -----

async function writeHtml(path: string, html: string): Promise<void> {
	const out = path.endsWith("/") ? join(DIST, path, "index.html") : join(DIST, path);
	await mkdir(dirname(out), { recursive: true });
	await Bun.write(out, html);
}

async function copyDir(src: string, dest: string): Promise<void> {
	if (!existsSync(src)) return;
	await mkdir(dest, { recursive: true });
	const entries = await Array.fromAsync(new Bun.Glob("*").scan({ cwd: src, absolute: false }));
	for (const entry of entries) {
		const srcPath = join(src, entry);
		const destPath = join(dest, entry);
		const stat = await Bun.file(srcPath).stat();
		if (stat.isDirectory()) {
			await copyDir(srcPath, destPath);
		} else {
			await Bun.write(destPath, Bun.file(srcPath));
		}
	}
}

// ---- RSS helper -----

function escXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function generateRssXml(posts: Post[]): string {
	const items = posts
		.map(
			(p) =>
				`    <item>
      <title>${escXml(p.title)}</title>
      <link>${siteConfig.url}/posts/${p.slug}/</link>
      <description>${escXml(p.description)}</description>
      <pubDate>${p.publishDate.toUTCString()}</pubDate>
      <guid>${siteConfig.url}/posts/${p.slug}/</guid>
    </item>`,
		)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(siteConfig.title)}</title>
    <link>${siteConfig.url}</link>
    <description>${escXml(siteConfig.description)}</description>
    <atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

// Entry point when run directly (not imported by serve.ts)
if (import.meta.main) {
	void buildAll().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
