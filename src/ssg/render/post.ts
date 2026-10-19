import { formatDate } from "../date";
import type { Post } from "../types";
import { renderLayout } from "./layout";
import { renderTemplate } from "./template";

interface PostNeighbours {
	newer?: Post;
	older?: Post;
}

export function renderPost(post: Post, neighbours: PostNeighbours = {}): string {
	const newer = neighbours.newer
		? renderTemplate("post-neighbour", {
				direction: "newer",
				slug: neighbours.newer.slug,
				title: neighbours.newer.title,
				label: "← Newer",
			})
		: "";
	const older = neighbours.older
		? renderTemplate("post-neighbour", {
				direction: "older",
				slug: neighbours.older.slug,
				title: neighbours.older.title,
				label: "Older →",
			})
		: "";

	return renderLayout(
		{
			title: post.title,
			path: `/posts/${post.slug}/`,
			description: post.description,
		},
		renderTemplate("post", {
			title: post.title,
			datetime: post.publishDate.toISOString(),
			date: formatDate(post.publishDate),
			tag: post.tag ? renderTemplate("post-tag", { tag: post.tag }) : "",
			html: post.html,
			newer,
			older,
		}),
	);
}

export function renderPostListItem(post: Post): string {
	return renderTemplate("post-list-item", {
		slug: post.slug,
		title: post.title,
		description: post.description
			? renderTemplate("post-description", { description: post.description })
			: "",
		datetime: post.publishDate.toISOString(),
		date: formatDate(post.publishDate),
		tag: post.tag ? renderTemplate("post-list-tag", { tag: post.tag }) : "",
	});
}

export function renderIndex(posts: Post[]): string {
	const items = posts.map(renderPostListItem).join("\n  ");
	return renderLayout({ title: "Home", path: "/" }, renderTemplate("index", { items }));
}
