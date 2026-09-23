import { installSignalHandlers, startApp } from "@harbor/server/app";
import { LockHeldError } from "@harbor/server/lockfile";
import { parseServeArgs } from "../args";

export async function runServe(argv: string[]): Promise<void> {
  const { port, db, serveUi, open } = parseServeArgs(argv);

  try {
    const app = await startApp({ port, dbPath: db, headless: !serveUi });
    installSignalHandlers(app);
    const suffix = serveUi ? " + web UI" : " (API only)";
    console.log(`Harbor listening on http://localhost:${app.port}${suffix}`);
    if (open) {
      openBrowser(`http://localhost:${app.port}/`).catch((error) => {
        console.warn(
          `Could not open browser: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
  } catch (error) {
    if (error instanceof LockHeldError) {
      console.error(
        `Harbor is already running (pid ${error.holder.pid}, port ${error.holder.port})`,
      );
      process.exit(1);
    }
    throw error;
  }
}

/** Best-effort cross-platform browser open. Never throws. */
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  const cmd =
    platform === "darwin"
      ? ["open", url]
      : platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`browser open command exited with code ${proc.exitCode}`);
  }
}
