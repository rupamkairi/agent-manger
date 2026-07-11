import { existsSync } from "node:fs";
import { join, normalize } from "node:path";

const WEB_DIST = join(import.meta.dir, "../../../apps/web/dist");

export async function serveStatic(pathname: string): Promise<Response> {
  if (!existsSync(WEB_DIST)) {
    return new Response("UI not built. Run the web build first.", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(WEB_DIST, safePath);
  if (filePath.startsWith(WEB_DIST)) {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
  }

  const index = Bun.file(join(WEB_DIST, "index.html"));
  if (await index.exists()) {
    return new Response(index, { headers: { "Content-Type": "text/html" } });
  }
  return new Response("Not found", { status: 404 });
}
