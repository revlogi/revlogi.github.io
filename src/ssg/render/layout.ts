import { siteConfig } from "../config";
import type { PageMeta } from "../types";

// renderLayout: HTML shell for all pages.
// Input: meta (<head> data) + body (page HTML string)
// Output: complete HTML document string
export function renderLayout(meta: PageMeta, body: string): string {
	return `<!doctype html>
<html lang="${siteConfig.lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${meta.title} • ${siteConfig.title}</title>
<meta name="description" content="${meta.description ?? siteConfig.description}"/>
<link rel="canonical" href="${siteConfig.url}"/>
<link rel="icon" href="/so.jpg" type="image/jpeg"/>
<link rel="apple-touch-icon" href="/so.jpg"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond&family=Open+Sans:wght@300;400&family=JetBrains+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"/>
<link rel="stylesheet" href="/katex.css"/>
</head>
<body>
<header><a href="/">${siteConfig.title}</a></header>
<main>
${body}
</main>
<footer></footer>
</body>
</html>`;
}
