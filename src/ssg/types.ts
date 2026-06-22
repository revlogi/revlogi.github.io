export interface Post {
	slug: string; // derived from file path: content/post/foo.md → "foo"
	title: string; // frontmatter.title
	description: string; // frontmatter.description
	publishDate: Date; // frontmatter.publishDate
	html: string; // markdown-it rendered body HTML
}

export interface PageMeta {
	title: string;
	description?: string;
}
