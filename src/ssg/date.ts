import type { Post } from "./types";

export function formatDate(d: Date): string {
	return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function sortPosts(posts: Post[]): Post[] {
	return [...posts].sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());
}
