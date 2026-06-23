import katex from "katex";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import texmath from "markdown-it-texmath";
import { createHighlighter } from "shiki";
import { parse as parseYaml } from "yaml";
import type { Post } from "./types";

// Shiki highlighter cache (created once, reused across files, ~150ms)
let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;

export async function createMarkdown(): Promise<MarkdownIt> {
	if (!highlighter) {
		highlighter = await createHighlighter({
			themes: ["github-light", "dracula"],
			langs: ["bash", "js", "ts", "python", "rust", "c", "cpp", "css", "html", "json", "diff"],
		});
	}
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
		highlight(str: string, lang: string): string {
			if (lang && highlighter) {
				try {
					return highlighter.codeToHtml(str, {
						lang,
						themes: { light: "github-light", dark: "dracula" },
					});
				} catch {
					// fallback if lang not supported
				}
			}
			const lines = md.utils
				.escapeHtml(str)
				.replace(/\n$/, "")
				.split("\n")
				.map((l) => l || " ");
			const wrapped = lines.map((l) => `<span class="line">${l}</span>`).join("\n");
			return `<pre><code>\n${wrapped}\n</code></pre>`;
		},
	});

	// retained plugins: footnote + anchor (heading ID) + texmath (katex math)
	md.use(footnote);
	md.use(anchor, {
		level: [1, 2, 3, 4],
		slugify(s: string) {
			return s
				.toLowerCase()
				.replace(/[^\w\s-]/g, "")
				.replace(/\s+/g, "-");
		},
	});
	md.use(texmath, { engine: katex, delimiters: "dollars" });

	return md;
}

// parsePost: transforms scan output into a Post.
// Input: raw file string (yaml frontmatter + markdown body)
// Output: Post (structured data + rendered HTML)
export async function parsePost(
	doc: {
		slug: string;
		rawFrontmatter: string;
		rawBody: string;
	},
	md: MarkdownIt,
): Promise<Post> {
	const fm = (parseYaml(doc.rawFrontmatter) ?? {}) as Record<string, unknown>;
	const html = md.render(doc.rawBody, {});

	return {
		slug: doc.slug,
		title: String(fm.title ?? ""),
		description: String(fm.description ?? ""),
		publishDate: toDate(fm.publishDate),
		html,
	};
}

function toDate(val: unknown): Date {
	if (val instanceof Date) return val;
	if (typeof val === "string") {
		const d = new Date(val);
		return Number.isNaN(d.getTime()) ? new Date(Date.parse(val)) : d;
	}
	return new Date();
}
