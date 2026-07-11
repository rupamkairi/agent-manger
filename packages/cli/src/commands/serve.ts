import { installSignalHandlers, startApp } from "@weave/server/app";
import { LockHeldError } from "@weave/server/lockfile";
import { parseServeArgs } from "../args";

export async function runServe(argv: string[]): Promise<void> {
  const { port, db, headless } = parseServeArgs(argv);

  try {
    const app = await startApp({ port, dbPath: db, headless });
    installSignalHandlers(app);
    const suffix = headless ? " (headless)" : "";
    console.log(`Weave listening on http://localhost:${app.port}${suffix}`);
  } catch (error) {
    if (error instanceof LockHeldError) {
      console.error(
        `Weave is already running (pid ${error.holder.pid}, port ${error.holder.port})`,
      );
      process.exit(1);
    }
    throw error;
  }
}
