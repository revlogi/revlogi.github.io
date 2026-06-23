import { formatDate } from "../date";
import type { Post } from "../types";
import { renderLayout } from "./layout";

// renderPost: a single post's full page.
// Input: Post (with title/publishDate/html)
// Output: HTML string
export function renderPost(post: Post): string {
	return renderLayout(
		{ title: post.title, description: post.description },
		`<article>
<h1>${post.title}</h1>
<time datetime="${post.publishDate.toISOString()}">${formatDate(post.publishDate)}</time>
<div class="prose">${post.html}</div>
</article>`,
	);
}

// renderIndex: home page = flat list of all posts.
// Input: Post[] (sorted)
// Output: HTML string
export function renderIndex(posts: Post[]): string {
	const items = posts
		.map(
			(p) =>
				`<li><time datetime="${p.publishDate.toISOString()}">${formatDate(p.publishDate)}</time><h2><a href="/posts/${p.slug}/">${p.title}</a></h2></li>`,
		)
		.join("\n  ");
	return renderLayout(
		{ title: "Home" },
		`<ul class="post-list">
  ${items}
</ul>`,
	);
}
