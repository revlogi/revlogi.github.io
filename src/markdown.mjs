import katex from "katex";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import texmath from "markdown-it-texmath";
import { createHighlighter } from "shiki";

// Async library initialization finishes before Gleam's synchronous main runs.
const highlighter = await createHighlighter({
	themes: ["vitesse-light", "vitesse-dark"],
	langs: ["bash", "js", "ts", "python", "rust", "c", "cpp", "css", "html", "json", "diff"],
});
const md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
	highlight(source, lang) {
		const code = source.replace(/\n$/, "");
		if (lang) {
			try {
				return highlighter.codeToHtml(code, {
					lang,
					themes: { light: "vitesse-light", dark: "vitesse-dark" },
				});
			} catch {
				// Unsupported languages retain escaped, line-wrapped code.
			}
		}
		const lines = md.utils
			.escapeHtml(code)
			.split("\n")
			.map((line) => line || " ");
		return `<pre><code>\n${lines.map((line) => `<span class="line">${line}</span>`).join("\n")}\n</code></pre>`;
	},
});
md.use(footnote);
md.use(anchor, {
	level: [1, 2, 3, 4],
	slugify: (text) =>
		text
			.toLowerCase()
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-"),
});
md.use(texmath, { engine: katex, delimiters: "dollars" });

export function render(source) {
	return md.render(source);
}
