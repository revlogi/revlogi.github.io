import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parse } from "yaml";
import { Error as GleamError, Ok, toList } from "./gleam.mjs";
import { render } from "./markdown.mjs";

function attempt(operation) {
	try {
		return new Ok(operation());
	} catch (error) {
		return new GleamError(error instanceof Error ? error.message : String(error));
	}
}

export function scanFiles() {
	return attempt(() => toList([...new Bun.Glob("content/post/**/*.md").scanSync()]));
}
export function readText(path) {
	return attempt(() => readFileSync(path, "utf8"));
}
export function relativePostPath(path) {
	return relative("content/post", path).split(sep).join("/");
}
export function parseYaml(source) {
	return attempt(() => parse(source) ?? {});
}
export function renderMarkdown(source) {
	return attempt(() => render(source));
}
export function parseDate(value) {
	return attempt(() => {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) throw new Error(`publishDate: invalid date "${value}"`);
		return [
			date.getTime(),
			date.toISOString(),
			date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
			date.toUTCString(),
		];
	});
}

export function includeDrafts() {
	return process.env.INCLUDE_DRAFTS === "1";
}

export function beginOutput() {
	return attempt(() => mkdtempSync(join(process.cwd(), ".dist-stage-")));
}
function inside(stage, path) {
	const base = resolve(stage);
	const output = resolve(base, path);
	if (output !== base && !output.startsWith(base + sep)) {
		throw new Error(`Output path escapes destination: ${path}`);
	}
	return output;
}
export function writeOutput(stage, path, text) {
	return attempt(() => {
		const output = inside(stage, path);
		mkdirSync(dirname(output), { recursive: true });
		writeFileSync(output, text);
	});
}
export function copyOutput(stage, source, destination, optional) {
	return attempt(() => {
		if (optional && !existsSync(source)) return;
		const output = inside(stage, destination);
		mkdirSync(dirname(output), { recursive: true });
		cpSync(source, output, {
			recursive: true,
			dereference: true,
			filter: (path) => !basename(path).startsWith("."),
		});
	});
}
export function commitOutput(stage) {
	return attempt(() => {
		const destination = resolve("dist");
		const backup = mkdtempSync(join(process.cwd(), ".dist-backup-"));
		rmSync(backup, { recursive: true });
		const hadPrevious = existsSync(destination);
		if (hadPrevious) renameSync(destination, backup);
		try {
			renameSync(stage, destination);
		} catch (error) {
			if (hadPrevious) {
				try {
					renameSync(backup, destination);
				} catch (restoreError) {
					throw new Error(
						`${error.message}; restore failed: ${restoreError.message}; previous output: ${backup}`,
					);
				}
			}
			throw error;
		}
		// The new output is committed. Failure to clean an old backup is a warning.
		try {
			rmSync(backup, { recursive: true, force: true });
		} catch (error) {
			console.warn(`Could not remove output backup ${backup}: ${error.message}`);
		}
	});
}
export function discardOutput(stage) {
	try {
		rmSync(stage, { recursive: true, force: true });
	} catch (error) {
		console.warn(`Could not remove staging directory ${stage}: ${error.message}`);
	}
}
export function print(message) {
	console.log(message);
}
export function fail(message) {
	console.error(message);
	process.exitCode = 1;
}
