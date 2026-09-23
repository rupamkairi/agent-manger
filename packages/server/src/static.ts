import { existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const SOURCE_DIST = join(import.meta.dir, "../../../apps/web/dist");

/**
 * Candidate web roots, first existing wins. The source-relative dist
 * covers dev/from-source; the executable-adjacent `web-dist` sidecar
 * covers `bun build --compile` binaries (import.meta.dir is virtual
 * `/$bunfs/...` there, and the source tree is absent).
 */
function candidateRoots(): string[] {
  const roots = [SOURCE_DIST];
  try {
    if (import.meta.dir.startsWith("/$bunfs")) {
      roots.unshift(join(dirname(process.execPath), "web-dist"));
    }
  } catch {
    // ignore — fall through to source-relative root
  }
  return roots;
}

export async function serveStatic(pathname: string): Promise<Response> {
  const roots = candidateRoots().filter((root) => existsSync(root));
  if (roots.length === 0) {
    return new Response("UI not built. Run the web build first.", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  for (const root of roots) {
    const filePath = join(root, safePath);
    if (filePath.startsWith(root)) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
    }
  }

  for (const root of roots) {
    const index = Bun.file(join(root, "index.html"));
    if (await index.exists()) {
      return new Response(index, { headers: { "Content-Type": "text/html" } });
    }
  }
  return new Response("Not found", { status: 404 });
}
