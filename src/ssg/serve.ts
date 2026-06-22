import { existsSync, watch } from "node:fs";
import { extname, join } from "node:path";
import { buildAll } from "./build";

const DIST = "dist";
const PORT = Number(process.env.PORT ?? 3000);

const WATCH_DIRS = ["content", "src/ssg", "public"];

const reloadClients = new Set<ReadableStreamDefaultController<Uint8Array>>();

let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

const mime: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".jpg": "image/jpeg",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webmanifest": "application/manifest+json",
};

const RELOAD_SCRIPT = `<script>const __es=new EventSource('/__reload');__es.onmessage=()=>location.reload()</script>`;

function resolvePath(url: URL): string {
	let path = url.pathname;
	if (path.endsWith("/")) path += "index.html";
	const full = join(DIST, path);
	if (existsSync(full)) return full;
	const withHtml = join(DIST, `${path}.html`);
	if (existsSync(withHtml)) return withHtml;
	return join(DIST, "404.html");
}

function notifyReload(): void {
	const payload = new TextEncoder().encode("data: reload\n\n");
	for (const controller of reloadClients) {
		try {
			controller.enqueue(payload);
		} catch {
			reloadClients.delete(controller);
		}
	}
}

async function rebuild(): Promise<void> {
	try {
		await buildAll();
		notifyReload();
	} catch (e) {
		console.error("  rebuild failed:", e);
	}
}

function startWatchers(): void {
	for (const dir of WATCH_DIRS) {
		if (!existsSync(dir)) continue;
		watch(dir, { recursive: true }, (_event, filename) => {
			const f = String(filename ?? "");
			if (f.startsWith("dist/") || f.endsWith(".swp") || f.endsWith(".tmp") || f.includes("4913"))
				return;
			if (rebuildTimer) clearTimeout(rebuildTimer);
			rebuildTimer = setTimeout(() => {
				rebuildTimer = null;
				console.log(`\n⚡ change detected (${f}) — rebuilding...`);
				void rebuild();
			}, 200);
		});
	}
}

async function main(): Promise<void> {
	await buildAll();
	startWatchers();

	const server = Bun.serve({
		port: PORT,
		development: true,
		async fetch(req) {
			const url = new URL(req.url);
			if (url.pathname === "/__reload") {
				const stream = new ReadableStream({
					start(controller) {
						reloadClients.add(controller);
						controller.enqueue(new TextEncoder().encode(": connected\n\n"));
					},
					cancel(controller) {
						reloadClients.delete(controller);
					},
				});
				return new Response(stream, {
					headers: {
						"content-type": "text/event-stream",
						"cache-control": "no-cache",
						connection: "keep-alive",
					},
				});
			}

			const filePath = resolvePath(url);
			if (!existsSync(filePath)) {
				return new Response("404", { status: 404 });
			}
			if (filePath.endsWith(".html")) {
				let html = await Bun.file(filePath).text();
				html = html.replace("</body>", `${RELOAD_SCRIPT}</body>`);
				return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
			}
			const file = Bun.file(filePath);
			const type = mime[extname(filePath)] ?? "application/octet-stream";
			return new Response(file, { headers: { "content-type": type } });
		},
	});

	console.log(`\n▶ serving ${DIST}/ at http://localhost:${server.port}`);
	console.log("  watching content/  src/ssg/  public/  (save → rebuild → refresh)");
}

void main();
