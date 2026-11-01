import { existsSync, realpathSync, statSync, watch } from "node:fs";
import { extname, join, resolve, sep } from "node:path";

const reloadScript =
	"<script>const __es=new EventSource('/__reload');__es.onmessage=()=>location.reload()</script>";

// Bun HTTP/watch/process primitives. Rebuild and MIME policies are supplied by Gleam.
export function startDev(directories, shouldRebuild, mimeType, buildCommand) {
	const port = Number(process.env.PORT ?? 3000);
	if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid PORT");
	const dist = resolve("dist");
	const clients = new Set();
	const watchers = [];
	let timer;
	let running = false;
	let pending = false;
	let child;

	function notify() {
		for (const controller of clients) {
			try {
				controller.enqueue(new TextEncoder().encode("data: reload\n\n"));
			} catch {
				clients.delete(controller);
			}
		}
	}
	async function rebuild() {
		pending = true;
		if (running) return;
		running = true;
		try {
			while (pending) {
				pending = false;
				try {
					child = Bun.spawn([...buildCommand], { stdout: "inherit", stderr: "inherit" });
					if ((await child.exited) === 0) notify();
				} catch (error) {
					console.error("Rebuild failed:", error);
				}
			}
		} finally {
			child = undefined;
			running = false;
		}
	}
	for (const directory of directories) {
		if (!existsSync(directory)) continue;
		watchers.push(
			watch(directory, { recursive: true }, (_event, filename) => {
				if (!shouldRebuild(join(directory, String(filename ?? "")))) return;
				clearTimeout(timer);
				timer = setTimeout(() => void rebuild(), 200);
			}),
		);
	}

	const server = Bun.serve({
		port,
		idleTimeout: 0,
		async fetch(request) {
			const url = new URL(request.url);
			if (url.pathname === "/__reload") {
				let client;
				const stream = new ReadableStream({
					start(controller) {
						client = controller;
						clients.add(controller);
						controller.enqueue(new TextEncoder().encode(": connected\n\n"));
					},
					cancel() {
						clients.delete(client);
					},
				});
				return new Response(stream, {
					headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
				});
			}
			let path;
			try {
				path = decodeURIComponent(url.pathname);
			} catch {
				return new Response("Bad URL", { status: 400 });
			}
			let file = resolve(dist, path.replace(/^\/+/, ""));
			if (file !== dist && !file.startsWith(dist + sep))
				return new Response("Forbidden", { status: 403 });
			if (path.endsWith("/")) file = join(file, "index.html");
			else if (existsSync(file) && statSync(file).isDirectory()) {
				url.pathname += "/";
				return Response.redirect(url, 308);
			} else if (!existsSync(file) && existsSync(`${file}.html`)) file += ".html";
			let status = 200;
			if (!existsSync(file)) {
				file = join(dist, "404.html");
				status = 404;
			}
			if (!existsSync(file)) return new Response("404", { status: 404 });
			// Do not serve symlinks escaping the output directory.
			if (!realpathSync(file).startsWith(realpathSync(dist) + sep))
				return new Response("Forbidden", { status: 403 });
			const extension = extname(file);
			if (extension === ".html") {
				const html = (await Bun.file(file).text()).replace("</body>", `${reloadScript}</body>`);
				return new Response(html, { status, headers: { "content-type": mimeType(extension) } });
			}
			return new Response(Bun.file(file), {
				status,
				headers: { "content-type": mimeType(extension) },
			});
		},
	});
	console.log(`▶ serving dist/ at http://localhost:${server.port}`);
	console.log("  watching content/, src/, public/ and Gleam manifests");
	function stop() {
		clearTimeout(timer);
		for (const watcher of watchers) watcher.close();
		child?.kill();
		server.stop(true);
		process.exit(0);
	}
	process.once("SIGTERM", stop);
	process.once("SIGINT", stop);
	return undefined;
}
