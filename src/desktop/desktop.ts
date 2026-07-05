import { bindDesktopApi } from "./api.ts";

const workspaceDistDir = `${Deno.cwd().replace(/\/$/, "")}/dist`;
const embeddedDistDir = new URL("../../dist", import.meta.url).pathname;
const distDir = await resolveDistDir();

const win = new Deno.BrowserWindow({
  title: "agent-manager",
  width: 1200,
  height: 800,
  resizable: true,
});

bindDesktopApi(win);

const server = Deno.serve({ hostname: "127.0.0.1", port: 0 }, async (req) => {
  const url = new URL(req.url);
  const filePath = url.pathname === "/" ? "/index.html" : url.pathname;

  try {
    const file = await Deno.readFile(`${distDir}${filePath}`);
    const ext = filePath.split(".").pop() ?? "";
    const contentType: Record<string, string> = {
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      mjs: "application/javascript",
      json: "application/json",
      png: "image/png",
      svg: "image/svg+xml",
      woff2: "font/woff2",
      ico: "image/x-icon",
    };
    return new Response(file, {
      headers: {
        "content-type": contentType[ext] ?? "application/octet-stream",
      },
    });
  } catch {
    try {
      const index = await Deno.readFile(`${distDir}/index.html`);
      return new Response(index, { headers: { "content-type": "text/html" } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
});

const addr = server.addr as Deno.NetAddr;

console.log(`Serving desktop app from ${distDir}`);
console.log(
  `Desktop window navigating to http://${addr.hostname}:${addr.port}/`,
);

await win.navigate(`http://${addr.hostname}:${addr.port}/`);

await new Promise(() => {});

async function resolveDistDir() {
  try {
    await Deno.stat(workspaceDistDir);
    return workspaceDistDir;
  } catch {
    return embeddedDistDir;
  }
}
