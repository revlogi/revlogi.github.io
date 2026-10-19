import type { Post } from "../types";
import { renderLayout } from "./layout";
import { renderPostListItem } from "./post";
import { renderTemplate } from "./template";

export function renderTagsIndex(tagCounts: Map<string, number>): string {
	const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
	const items = sorted
		.map(([tag, count]) => renderTemplate("tag-item", { tag, count }))
		.join("\n  ");
	return renderLayout({ title: "Tags", path: "/tags/" }, renderTemplate("tags-index", { items }));
}

export function renderTagPage(tag: string, posts: Post[]): string {
	const items = posts.map(renderPostListItem).join("\n  ");
	return renderLayout(
		{ title: `# ${tag}`, path: `/tags/${tag}/` },
		renderTemplate("tag-page", { tag, items }),
	);
}
