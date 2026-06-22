import { basename, dirname, relative, sep } from "node:path";
import type { Post } from "./types";

// scanPosts: reads content/post/**/*.md, splits frontmatter from body.
// Output: a Post skeleton (body still raw markdown string)
export async function scanPosts(): Promise<Array<Omit<Post, "html"> & { rawBody: string }>> {
	const pattern = new Bun.Glob("content/post/**/*.md");
	const files: string[] = [];
	for await (const path of pattern.scan()) files.push(path);

	const docs: Array<
		Omit<Post, "html" | "publishDate" | "draft"> & { rawFrontmatter: string; rawBody: string }
	> = [];

	for (const filePath of files) {
		const raw = await Bun.file(filePath).text();

		// split ---frontmatter--- from body
		const fmEnd = raw.indexOf("\n---", 3);
		const rawFrontmatter = raw.startsWith("---") && fmEnd !== -1 ? raw.slice(3, fmEnd).trim() : "";
		const rawBody =
			raw.startsWith("---") && fmEnd !== -1 ? raw.slice(fmEnd + 4).replace(/^\n/, "") : raw;

		const slug = deriveSlug(filePath);
		docs.push({ slug, filePath, rawFrontmatter, rawBody });
	}
	return docs;
}

function deriveSlug(filePath: string): string {
	let rel = relative("content/post", filePath).replace(/\.md$/, "");
	if (rel === "index" || rel.endsWith(`${sep}index`)) {
		rel = dirname(rel) === "." ? basename(dirname(filePath)) : dirname(rel);
	}
	return rel.split(sep).join("/");
}
