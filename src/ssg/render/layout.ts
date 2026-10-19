import { siteConfig } from "../config";
import type { PageMeta } from "../types";
import { renderTemplate } from "./template";

// renderLayout: HTML shell for all pages.
// Input: meta (<head> data) + body (page HTML string)
// Output: complete HTML document string
export function renderLayout(meta: PageMeta, body: string): string {
	const canonicalUrl = `${siteConfig.url}${meta.path}`;
	const navItems = (
		[
			["About", "/about/"],
			["Friends", "/friends/"],
			["Links", "/links/"],
			["Tags", "/tags/"],
			["RSS", "/rss.xml"],
		] as const
	)
		.map(([label, path]) => {
			const current = meta.path === path ? ' aria-current="page"' : "";
			return renderTemplate("nav-item", { path, current, label });
		})
		.join("");

	return renderTemplate("layout", {
		lang: siteConfig.lang,
		title: meta.title,
		siteTitle: siteConfig.title,
		description: meta.description ?? siteConfig.description,
		canonicalUrl,
		navItems,
		body,
	});
}
