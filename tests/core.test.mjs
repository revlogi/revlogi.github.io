import { describe, expect, test } from "bun:test";
import { from_list, to_list } from "../build/dev/javascript/gleam_stdlib/gleam/dict.mjs";
import { None, Some } from "../build/dev/javascript/gleam_stdlib/gleam/option.mjs";
import { Error as GleamError, Ok, toList } from "../build/dev/javascript/prelude.mjs";
import * as build from "../build/dev/javascript/revlogi_blog/build.mjs";
import * as config from "../build/dev/javascript/revlogi_blog/config.mjs";
import * as content from "../build/dev/javascript/revlogi_blog/content.mjs";
import * as dev from "../build/dev/javascript/revlogi_blog/dev.mjs";
import { PostView } from "../build/dev/javascript/revlogi_blog/page.mjs";
import * as pipeline from "../build/dev/javascript/revlogi_blog/pipeline.mjs";
import * as order from "../build/dev/javascript/revlogi_blog/post_order.mjs";
import * as rss from "../build/dev/javascript/revlogi_blog/rss.mjs";
import * as runtime from "../build/dev/javascript/revlogi_blog/runtime.mjs";
import { derive_slug } from "../build/dev/javascript/revlogi_blog/slug.mjs";
import { substitute } from "../build/dev/javascript/revlogi_blog/template.mjs";
import { slugCases } from "./slug-cases.mjs";
import { templateCases } from "./template-cases.mjs";

function ok(result) {
	expect(result).toBeInstanceOf(Ok);
	return result[0];
}
function dict(values) {
	return from_list(toList(Object.entries(values).map(([key, value]) => [key, String(value)])));
}
function document(fields) {
	return `---\n${Object.entries(fields)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
		.join("\n")}\n---\n\n## Body\nText.`;
}
const valid = { title: "Example", publishDate: "6 July 2026" };

for (const { name, filePath, expected } of slugCases) {
	test(`slug: ${name}`, () => {
		expect(derive_slug(runtime.relative_post_path(filePath))).toBe(expected);
	});
}
for (const fixture of templateCases) {
	test(`template: ${fixture.name}`, () => {
		const result = substitute("fixture", fixture.source, dict(fixture.values));
		if ("missingKey" in fixture) {
			expect(result).toBeInstanceOf(GleamError);
			expect(result[0].template_name).toBe("fixture");
			expect(result[0].key).toBe(fixture.missingKey);
		} else expect(ok(result)).toBe(fixture.expected);
	});
}

describe("metadata and scanning", () => {
	test("splits strings without interpreting YAML or Markdown", () => {
		const [header, body] = content.split_frontmatter(document(valid));
		expect(header).toContain('title: "Example"');
		expect(body).toBe("\n## Body\nText.");
	});
	test("normalizes CRLF frontmatter", () => {
		expect(content.split_frontmatter(document(valid).replaceAll("\n", "\r\n"))).toEqual(
			content.split_frontmatter(document(valid)),
		);
	});
	test("leaves a document without frontmatter intact", () => {
		expect(content.split_frontmatter("## Hello\n")).toEqual(["", "## Hello\n"]);
	});
	test("retains source path and defaults optional strings", () => {
		const post = ok(content.parse_post("content/post/example.md", document(valid)));
		expect(post.source_path).toBe("content/post/example.md");
		expect(post.article.view.slug).toBe("example");
		expect(post.article.view.description).toBe("");
		expect(post.article.view.tag).toBe("");
		expect(post.article.view.html).toContain('<h2 id="body"');
	});
	for (const [name, fields, key] of [
		["missing title", { publishDate: valid.publishDate }, "title"],
		["blank title", { ...valid, title: "  " }, "title"],
		["numeric title", { ...valid, title: 42 }, "title"],
		["missing date", { title: "Example" }, "publishDate"],
		["invalid date", { ...valid, publishDate: "not a date" }, "publishDate"],
		["blank date", { ...valid, publishDate: "" }, "publishDate"],
		["numeric date", { ...valid, publishDate: 42 }, "publishDate"],
		["null description", { ...valid, description: null }, "description"],
		["boolean tag", { ...valid, tag: true }, "tag"],
	]) {
		test(`rejects ${name} with source-file context`, () => {
			const result = content.parse_post("content/post/bad.md", document(fields));
			expect(result).toBeInstanceOf(GleamError);
			expect(result[0]).toContain("content/post/bad.md:");
			expect(result[0]).toContain(key);
		});
	}
	test("unknown fields, including draft, remain ignored", () => {
		expect(
			ok(content.parse_post("content/post/example.md", document({ ...valid, draft: true }))),
		).toBeInstanceOf(content.Post);
	});
	test("reports invalid YAML with the source path", () => {
		const result = content.parse_post("content/post/bad.md", "---\ntitle: [\n---\nbody");
		expect(result).toBeInstanceOf(GleamError);
		expect(result[0]).toContain("content/post/bad.md:");
	});
});

function optionalSlug(value) {
	if (value instanceof Some) return value[0].slug;
	expect(value).toBeInstanceOf(None);
	return null;
}
const orderCases = [
	{ name: "empty", rows: [], expected: [] },
	{ name: "singleton", rows: [["only", 6]], expected: [["only", null, null]] },
	{
		name: "two",
		rows: [
			["old", 2],
			["new", 10],
		],
		expected: [
			["new", null, "old"],
			["old", "new", null],
		],
	},
	{
		name: "middle",
		rows: [
			["middle", 6],
			["old", 2],
			["new", 10],
		],
		expected: [
			["new", null, "middle"],
			["middle", "new", "old"],
			["old", "middle", null],
		],
	},
	{
		name: "stable ties",
		rows: [
			["z", 6],
			["a", 6],
		],
		expected: [
			["z", null, "a"],
			["a", "z", null],
		],
	},
	{
		name: "negative/zero",
		rows: [
			["before", -1],
			["epoch", 0],
		],
		expected: [
			["epoch", null, "before"],
			["before", "epoch", null],
		],
	},
];
for (const { name, rows, expected } of orderCases) {
	test(`ordering: ${name}`, () => {
		const input = toList(rows.map(([slug, time]) => ({ slug, time })));
		const sorted = order.sort_posts(input, (post) => post.time);
		const result = [...order.with_neighbours(sorted)].map((item) => [
			item.post.slug,
			optionalSlug(item.newer),
			optionalSlug(item.older),
		]);
		expect(result).toEqual(expected);
		expect([...input].map((post) => [post.slug, post.time])).toEqual(rows);
	});
}

function view(slug, tag = "") {
	return new PostView(
		slug,
		slug,
		"",
		"2026-07-06T00:00:00.000Z",
		"6 Jul 2026",
		tag,
		"<p>{{title}}</p>",
	);
}

test("grouping preserves first-seen order and group post order", () => {
	const groups = pipeline.group_tags(
		toList([
			view("first", "z"),
			view("empty"),
			view("second", "a"),
			view("last", "z"),
			view("zero", "0"),
		]),
	);
	expect(
		[...groups].map((group) => [group.tag, [...group.posts].map((post) => post.slug)]),
	).toEqual([
		["z", ["first", "last"]],
		["a", ["second"]],
		["0", ["zero"]],
	]);
});
test("full HTML pipeline includes static pages without post data", () => {
	const templates = ok(build.load_templates());
	const pages = new Map(
		to_list(ok(pipeline.render_all(config.site(), templates, toList([]), "<p>{{title}}</p>"))),
	);
	expect([...pages.keys()].sort()).toEqual(["/", "/about/", "/friends/", "/links/", "/tags/"]);
	expect(pages.get("/links/")).toContain("<p>{{title}}</p>");
});
test("pipeline sorts full payloads and retains duplicate-route behavior", () => {
	const templates = ok(build.load_templates());
	const old = new pipeline.Article(view("same", "old"), 2);
	const newer = new pipeline.Article(view("same", "new"), 6);
	const pages = new Map(
		to_list(ok(pipeline.render_all(config.site(), templates, toList([old, newer]), ""))),
	);
	expect(pages.size).toBe(8);
	expect(pages.get("/posts/same/")).toContain("/tags/old/");
	expect(pages.get("/posts/same/")).toContain('class="post-nav-newer"');
});
test("template errors propagate without a partial collection", () => {
	const templates = ok(build.load_templates());
	const broken = templates.withFields({
		layout: templates.layout.withFields({ post: "{{missing}}" }),
	});
	const result = pipeline.render_all(
		config.site(),
		broken,
		toList([new pipeline.Article(view("post"), 0)]),
		"",
	);
	expect(result).toBeInstanceOf(GleamError);
	expect(result[0].template_name).toBe("post");
});
test("equal-count tags retain first-seen rather than alphabetical order", () => {
	const templates = ok(build.load_templates());
	const input = toList([
		new pipeline.Article(view("first", "z-tag"), 0),
		new pipeline.Article(view("second", "a-tag"), 0),
	]);
	const pages = new Map(to_list(ok(pipeline.render_all(config.site(), templates, input, ""))));
	const html = pages.get("/tags/");
	expect(html.indexOf('href="/tags/z-tag/"')).toBeLessThan(html.indexOf('href="/tags/a-tag/"'));
});
test("empty optional fragments are not evaluated", () => {
	const templates = ok(build.load_templates());
	const broken = templates.withFields({
		listing: templates.listing.withFields({
			post_description: "{{missing}}",
			post_list_tag: "{{missing}}",
		}),
		layout: templates.layout.withFields({ post_tag: "{{missing}}", post_neighbour: "{{missing}}" }),
	});
	const pages = ok(
		pipeline.render_all(config.site(), broken, toList([new pipeline.Article(view("only"), 0)]), ""),
	);
	expect(new Map(to_list(pages)).has("/posts/only/")).toBe(true);
});
test("empty collections do not evaluate item templates", () => {
	const templates = ok(build.load_templates());
	const broken = templates.withFields({
		listing: templates.listing.withFields({
			post_list_item: "{{missing}}",
			tag_item: "{{missing}}",
		}),
	});
	expect([...to_list(ok(pipeline.render_all(config.site(), broken, toList([]), "")))]).toHaveLength(
		5,
	);
});
test("RSS escapes XML and sorts articles", () => {
	const old = ok(
		content.parse_post(
			"content/post/old.md",
			document({ ...valid, title: '<Old & "quoted">', publishDate: "1 July 2026" }),
		),
	);
	const newer = ok(
		content.parse_post(
			"content/post/new.md",
			document({ ...valid, title: "New", publishDate: "6 July 2026" }),
		),
	);
	const templates = ok(build.load_rss_templates());
	const xml = ok(rss.generate(config.site(), templates, toList([old, newer])));
	expect(xml).toContain("&lt;Old &amp; &quot;quoted&quot;&gt;");
	expect(xml.indexOf("<title>New</title>")).toBeLessThan(xml.indexOf("<title>&lt;Old"));
	expect(xml).toContain("GMT</pubDate>");
});
test("RSS uses supplied templates without reinterpreting inserted placeholders", () => {
	const post = ok(
		content.parse_post("content/post/example.md", document({ ...valid, title: "{{items}}" })),
	);
	const templates = new rss.Templates("<feed>{{items}}</feed>", "<entry>{{title}}</entry>");
	expect(ok(rss.generate(config.site(), templates, toList([post])))).toBe(
		"<feed><entry>{{items}}</entry></feed>",
	);
});
test("RSS skips item templates for an empty feed", () => {
	const templates = new rss.Templates("<feed>{{items}}</feed>", "{{missing}}");
	expect(ok(rss.generate(config.site(), templates, toList([])))).toBe("<feed></feed>");
});
for (const [field, templateName] of [
	["feed", "rss"],
	["item", "rss-item"],
]) {
	test(`RSS propagates missing values from ${templateName}.xml`, () => {
		const templates = ok(build.load_rss_templates()).withFields({ [field]: "{{missing}}" });
		const post = ok(content.parse_post("content/post/example.md", document(valid)));
		const result = rss.generate(config.site(), templates, toList([post]));
		expect(result).toBeInstanceOf(GleamError);
		expect(result[0].template_name).toBe(templateName);
		expect(result[0].key).toBe("missing");
	});
}
test("Markdown retains anchors, math, footnotes, and dual-theme highlighting", () => {
	const html = ok(
		runtime.render_markdown(
			"# Heading\n\n$x^2$\n\n```python\nprint(42)\n```\n\nNote.[^a]\n\n[^a]: Text.",
		),
	);
	expect(html).toContain('id="heading"');
	expect(html).toContain('class="katex"');
	expect(html).toContain("--shiki-dark");
	expect(html).toContain('class="footnotes"');
});
test("unsupported code language falls back to escaped code", () => {
	expect(ok(runtime.render_markdown("```unknown-language\n<bad>\n```"))).toContain("&lt;bad&gt;");
});
for (const [url, expected] of [
	["/", "index.html"],
	["/posts/a/", "posts/a/index.html"],
	["/rss.xml", "rss.xml"],
]) {
	test(`output path: ${url}`, () => expect(build.output_path(url)).toBe(expected));
}
test("development policies handle generated assets and ignore editor noise", () => {
	expect(dev.mime_type(".xml")).toBe("application/rss+xml; charset=utf-8");
	expect(dev.should_rebuild("src/page.gleam")).toBe(true);
	expect(dev.should_rebuild("content/.DS_Store")).toBe(false);
	expect(dev.should_rebuild("content/post/test.md.swp")).toBe(false);
});
