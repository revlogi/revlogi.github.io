import { afterEach, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mainModule = join(root, "build/dev/javascript/revlogi_blog/revlogi_blog.mjs");
const devModule = join(root, "build/dev/javascript/revlogi_blog/dev.mjs");
const preludeModule = join(root, "build/dev/javascript/prelude.mjs");
const workspaces = [];
function workspace() {
	const path = mkdtempSync(join(tmpdir(), "revlogi-test-"));
	workspaces.push(path);
	mkdirSync(join(path, "content/post"), { recursive: true });
	mkdirSync(join(path, "content/page"), { recursive: true });
	mkdirSync(join(path, "public"));
	mkdirSync(join(path, "dist"));
	writeFileSync(join(path, "dist/previous.txt"), "previous output");
	writeFileSync(join(path, "content/page/links.md"), "# Links\n\nExample.");
	writeFileSync(join(path, "content/page/about.md"), "An **editable** introduction.");
	cpSync(join(root, "src/ssg/templates"), join(path, "src/ssg/templates"), { recursive: true });
	cpSync(join(root, "src/ssg/styles"), join(path, "src/ssg/styles"), { recursive: true });
	return path;
}
function post(path, header = 'title: "Example"\npublishDate: "6 July 2026"') {
	writeFileSync(join(path, "content/post/example.md"), `---\n${header}\n---\n\n## Body\nHello.`);
}
function run(path, env = {}) {
	return Bun.spawnSync(
		["bun", "-e", `import { main } from ${JSON.stringify(mainModule)}; main();`],
		{ cwd: path, env: { ...process.env, INCLUDE_DRAFTS: "0", ...env } },
	);
}
function unchanged(path) {
	expect(readFileSync(join(path, "dist/previous.txt"), "utf8")).toBe("previous output");
	expect(readdirSync(path).filter((name) => name.startsWith(".dist-"))).toEqual([]);
}
afterEach(() => {
	for (const path of workspaces.splice(0)) rmSync(path, { recursive: true, force: true });
});

test("build emits clean URLs, RSS, assets, CSS and replaces old output", () => {
	const path = workspace();
	post(path);
	writeFileSync(join(path, "public/asset.txt"), "asset");
	writeFileSync(join(path, "public/rss.xml"), "must not override the generated feed");
	writeFileSync(join(path, "outside.css"), "do not overwrite the symlink target");
	symlinkSync(join(path, "outside.css"), join(path, "public/style.css"));
	writeFileSync(join(path, "public/.hidden"), "not published");
	const result = run(path);
	expect(result.exitCode).toBe(0);
	expect(existsSync(join(path, "dist/previous.txt"))).toBe(false);
	expect(readFileSync(join(path, "dist/posts/example/index.html"), "utf8")).toContain(
		"<h1>Example</h1>",
	);
	expect(readFileSync(join(path, "dist/rss.xml"), "utf8")).toContain("<title>Example</title>");
	expect(readFileSync(join(path, "dist/asset.txt"), "utf8")).toBe("asset");
	expect(existsSync(join(path, "dist/.hidden"))).toBe(false);
	expect(existsSync(join(path, "dist/style.css"))).toBe(true);
	expect(readFileSync(join(path, "outside.css"), "utf8")).toBe(
		"do not overwrite the symlink target",
	);
}, 10_000);

test("About renders Markdown and picks up content edits on rebuild", () => {
	const path = workspace();
	expect(run(path).exitCode).toBe(0);
	const output = join(path, "dist/about/index.html");
	expect(readFileSync(output, "utf8")).toContain("An <strong>editable</strong> introduction.");
	writeFileSync(
		join(path, "content/page/about.md"),
		"Updated [profile](https://example.com).\n\n{{title}}",
	);
	expect(run(path).exitCode).toBe(0);
	const html = readFileSync(output, "utf8");
	expect(html).toContain('<a href="https://example.com">profile</a>');
	expect(html).toContain("{{title}}");
	expect(html).not.toContain("An <strong>editable</strong> introduction.");
}, 10_000);

test("missing About Markdown preserves previous output", () => {
	const path = workspace();
	rmSync(join(path, "content/page/about.md"));
	const result = run(path);
	expect(result.exitCode).toBe(1);
	expect(result.stderr.toString()).toContain("content/page/about.md");
	unchanged(path);
}, 10_000);

test("drafts are opt-in and never leak into published pages, tags, RSS or neighbours", () => {
	const path = workspace();
	post(path, 'title: "Published"\npublishDate: "4 July 2026"\ntag: shared\ndraft: false');
	writeFileSync(
		join(path, "content/post/older.md"),
		'---\ntitle: "Older"\npublishDate: "2 July 2026"\ntag: shared\n---\nOlder body.',
	);
	writeFileSync(
		join(path, "content/post/draft.md"),
		'---\ntitle: "Hidden Draft"\npublishDate: "6 July 2026"\ntag: secret\ndraft: true\n---\nUnfinished body.',
	);

	function expectPublishedOnly() {
		expect(existsSync(join(path, "dist/posts/draft/index.html"))).toBe(false);
		expect(existsSync(join(path, "dist/tags/secret/index.html"))).toBe(false);
		for (const file of [
			"index.html",
			"rss.xml",
			"tags/index.html",
			"tags/shared/index.html",
			"posts/example/index.html",
			"posts/older/index.html",
		]) {
			const html = readFileSync(join(path, "dist", file), "utf8");
			expect(html).not.toContain("Hidden Draft");
			expect(html).not.toContain("/posts/draft/");
			expect(html).not.toContain("/tags/secret/");
		}
		expect(readFileSync(join(path, "dist/tags/index.html"), "utf8")).toContain("(2)</li>");
		expect(readFileSync(join(path, "dist/posts/example/index.html"), "utf8")).toContain(
			'class="post-nav-older" href="/posts/older/"',
		);
		expect(readFileSync(join(path, "dist/posts/older/index.html"), "utf8")).toContain(
			'class="post-nav-newer" href="/posts/example/"',
		);
	}

	expect(run(path).exitCode).toBe(0);
	expectPublishedOnly();
	expect(run(path, { INCLUDE_DRAFTS: "1" }).exitCode).toBe(0);
	expect(readFileSync(join(path, "dist/posts/draft/index.html"), "utf8")).toContain("Hidden Draft");
	expect(readFileSync(join(path, "dist/index.html"), "utf8")).toContain("Hidden Draft");
	expect(readFileSync(join(path, "dist/rss.xml"), "utf8")).toContain("Hidden Draft");
	expect(existsSync(join(path, "dist/tags/secret/index.html"))).toBe(true);
	// Replacing a preview build must remove stale draft pages and tags as well.
	expect(run(path).exitCode).toBe(0);
	expectPublishedOnly();
}, 10_000);

test("invalid draft metadata still fails a default build", () => {
	const path = workspace();
	post(path, 'publishDate: "6 July 2026"\ndraft: true');
	const result = run(path);
	expect(result.exitCode).toBe(1);
	expect(result.stderr.toString()).toContain("content/post/example.md: title");
	unchanged(path);
}, 10_000);

test("invalid metadata exits unsuccessfully and preserves previous output", () => {
	const path = workspace();
	post(path, 'publishDate: "6 July 2026"');
	const result = run(path);
	expect(result.exitCode).toBe(1);
	expect(result.stderr.toString()).toContain("content/post/example.md: title");
	unchanged(path);
}, 10_000);

test("failed asset copy cleans staging and preserves previous output", () => {
	const path = workspace();
	post(path);
	rmSync(join(path, "src/ssg/styles/global.css"));
	const result = run(path);
	expect(result.exitCode).toBe(1);
	expect(result.stderr.toString()).toContain("global.css");
	unchanged(path);
}, 10_000);

test("output paths cannot escape staging", () => {
	const path = workspace();
	post(path, 'title: "Example"\npublishDate: "6 July 2026"\ntag: "../../escape"');
	const result = run(path);
	expect(result.exitCode).toBe(1);
	expect(result.stderr.toString()).toContain("escapes destination");
	expect(existsSync(join(path, "escape"))).toBe(false);
	unchanged(path);
}, 10_000);

test("failed directory replacement restores previous output", () => {
	const path = workspace();
	const runtimeModule = join(root, "build/dev/javascript/revlogi_blog/runtime.mjs");
	const script = `import { commit_output } from ${JSON.stringify(runtimeModule)}; import { Error as Failure } from ${JSON.stringify(preludeModule)}; const result = commit_output('missing-stage'); if (result instanceof Failure) console.error(result[0]); else process.exitCode = 3;`;
	const result = Bun.spawnSync(["bun", "-e", script], { cwd: path });
	expect(result.exitCode).toBe(0);
	expect(result.stderr.toString()).toContain("ENOENT");
	unchanged(path);
}, 10_000);

test("template failures preserve previous output", () => {
	const path = workspace();
	post(path);
	writeFileSync(join(path, "src/ssg/templates/post.html"), "{{missing}}");
	const result = run(path);
	expect(result.exitCode).toBe(1);
	expect(result.stderr.toString()).toContain('post.html: missing template value "missing"');
	unchanged(path);
}, 10_000);

for (const name of ["rss", "rss-item"]) {
	test(`invalid ${name}.xml preserves previous output`, () => {
		const path = workspace();
		post(path);
		writeFileSync(join(path, `src/ssg/templates/${name}.xml`), "{{missing}}");
		const result = run(path);
		expect(result.exitCode).toBe(1);
		expect(result.stderr.toString()).toContain(`${name}.xml: missing template value "missing"`);
		unchanged(path);
	}, 10_000);
}
test("missing RSS template preserves previous output", () => {
	const path = workspace();
	post(path);
	rmSync(join(path, "src/ssg/templates/rss.xml"));
	const result = run(path);
	expect(result.exitCode).toBe(1);
	expect(result.stderr.toString()).toContain("src/ssg/templates/rss.xml");
	unchanged(path);
}, 10_000);

test("dev HTTP, SSE, source watching and failed rebuild handling", async () => {
	const path = workspace();
	writeFileSync(join(path, "dist/index.html"), "<html><body>initial</body></html>");
	writeFileSync(join(path, "dist/style.css"), "body{}");
	mkdirSync(join(path, "dist/sub"));
	writeFileSync(join(path, "dist/sub/index.html"), "<body>subdirectory</body>");
	writeFileSync(join(path, "secret.txt"), "private");
	const command = `import { existsSync, writeFileSync } from 'node:fs'; if (existsSync('content/fail')) process.exit(1); writeFileSync('dist/index.html', '<html><body>rebuilt</body></html>');`;
	const script = `import { start_server, should_rebuild, mime_type } from ${JSON.stringify(devModule)}; import { toList } from ${JSON.stringify(preludeModule)}; start_server(toList(['content','src']), should_rebuild, mime_type, toList(['bun','-e',${JSON.stringify(command)}]));`;
	const child = Bun.spawn(["bun", "-e", script], {
		cwd: path,
		env: { ...process.env, PORT: "0" },
		stdout: "pipe",
		stderr: "inherit",
	});
	let output = "";
	const reading = (async () => {
		for await (const chunk of child.stdout) output += new TextDecoder().decode(chunk);
	})();
	const abort = new AbortController();
	try {
		const deadline = Date.now() + 8_000;
		while (!output.includes("http://localhost:") && Date.now() < deadline) await Bun.sleep(20);
		const match = output.match(/http:\/\/localhost:(\d+)/);
		expect(match).not.toBeNull();
		const url = `http://localhost:${match[1]}`;
		const response = await fetch(url);
		expect(await response.text()).toContain("EventSource('/__reload')");
		expect((await fetch(`${url}/style.css`)).headers.get("content-type")).toContain("text/css");
		expect((await fetch(`${url}/missing`)).status).toBe(404);
		expect((await fetch(`${url}/sub`, { redirect: "manual" })).status).toBe(308);
		expect((await fetch(`${url}/..%2fsecret.txt`)).status).toBe(403);
		const stream = await fetch(`${url}/__reload`, { signal: abort.signal });
		expect(stream.headers.get("content-type")).toBe("text/event-stream");
		const reader = stream.body.getReader();
		expect(new TextDecoder().decode((await reader.read()).value)).toContain(": connected");
		writeFileSync(join(path, "src/change.gleam"), "// change");
		const reload = await Promise.race([
			reader.read(),
			Bun.sleep(5_000).then(() => {
				throw new Error("No live reload after source change");
			}),
		]);
		expect(new TextDecoder().decode(reload.value)).toContain("data: reload");
		expect(await (await fetch(url)).text()).toContain("rebuilt");
		writeFileSync(join(path, "content/fail"), "fail next build");
		const next = await Promise.race([
			reader.read().then(
				() => "event",
				() => "closed",
			),
			Bun.sleep(800).then(() => "no event"),
		]);
		expect(next).toBe("no event");
		expect(await (await fetch(url)).text()).toContain("rebuilt");
	} finally {
		abort.abort();
		child.kill();
		await child.exited;
		await reading;
	}
}, 15_000);

test("the real dev command preserves draft preview across Gleam rebuilds", async () => {
	const path = workspace();
	post(path, 'title: "Example"\npublishDate: "6 July 2026"\ndraft: true');
	cpSync(join(root, "src"), join(path, "src"), { recursive: true });
	cpSync(join(root, "build/packages"), join(path, "build/packages"), { recursive: true });
	for (const file of ["gleam.toml", "manifest.toml", "package.json"]) {
		cpSync(join(root, file), join(path, file));
	}
	symlinkSync(join(root, "node_modules"), join(path, "node_modules"), "dir");
	const child = spawn("bun", ["run", "dev"], {
		cwd: path,
		env: { ...process.env, PORT: "0", INCLUDE_DRAFTS: "1" },
		detached: true,
		stdio: ["ignore", "pipe", "pipe"],
	});
	const closed = once(child, "close");
	let output = "";
	child.stdout.on("data", (data) => {
		output += data.toString();
	});
	child.stderr.on("data", (data) => {
		output += data.toString();
	});
	const abort = new AbortController();
	try {
		const deadline = Date.now() + 10_000;
		while (!output.includes("http://localhost:") && Date.now() < deadline) await Bun.sleep(25);
		expect(output).toContain("http://localhost:");
		const url = output.match(/http:\/\/localhost:\d+/)[0];
		expect(await (await fetch(`${url}/posts/example/`)).text()).toContain("<h1>Example</h1>");
		const response = await fetch(`${url}/__reload`, { signal: abort.signal });
		const reader = response.body.getReader();
		await reader.read();
		const configPath = join(path, "src/config.gleam");
		writeFileSync(
			configPath,
			readFileSync(configPath, "utf8").replace("RevLogi's blog", "Rebuilt Gleam Blog"),
		);
		const event = await Promise.race([
			reader.read(),
			Bun.sleep(8_000).then(() => {
				throw new Error(`No reload from Gleam rebuild: ${output}`);
			}),
		]);
		expect(new TextDecoder().decode(event.value)).toContain("data: reload");
		expect(await (await fetch(url)).text()).toContain("Home • Rebuilt Gleam Blog");
		expect(await (await fetch(`${url}/posts/example/`)).text()).toContain("<h1>Example</h1>");
	} finally {
		abort.abort();
		try {
			process.kill(-child.pid, "SIGTERM");
		} catch (error) {
			if (error.code !== "ESRCH") {
				console.error("Could not stop dev process group:", error);
				child.kill("SIGTERM");
			}
		}
		await closed;
	}
}, 20_000);
