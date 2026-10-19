import { readFileSync } from "node:fs";

// Values are inserted verbatim, including already-rendered HTML. Replacement is
// single-pass so placeholders inside article content remain untouched.
export function renderTemplate(name: string, values: Record<string, string | number> = {}): string {
	const source = readFileSync(new URL(`../templates/${name}.html`, import.meta.url), "utf8");
	return source.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
		if (!Object.hasOwn(values, key)) {
			throw new Error(`Missing template value "${key}" in ${name}.html`);
		}
		return String(values[key]);
	});
}
