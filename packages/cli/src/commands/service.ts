import { homedir } from "node:os";
import { join } from "node:path";
import { readLock } from "@weave/server/lockfile";
import { parseServiceArgs } from "../args";
import { detectServicePlatform } from "../service/detect";
import { installLaunchd, launchdStatus, uninstallLaunchd } from "../service/launchd";
import { installSystemd, systemdStatus, uninstallSystemd } from "../service/systemd";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "EPERM";
  }
}

async function printStatus(): Promise<void> {
  const weaveHome = process.env.WEAVE_HOME ?? join(homedir(), ".weave");
  const platform = detectServicePlatform();

  const { registered } =
    platform === "launchd" ? await launchdStatus() : await systemdStatus();
  console.log(`Unit: ${registered ? "registered" : "not registered"} (${platform})`);

  const lock = readLock(weaveHome);
  const alive = lock ? isProcessAlive(lock.pid) : false;
  console.log(
    alive && lock
      ? `Process: running (pid ${lock.pid}, port ${lock.port})`
      : "Process: not running",
  );

  const port = lock?.port ?? 3000;
  try {
    const response = await fetch(`http://localhost:${port}/api/v1/health`, {
      signal: AbortSignal.timeout(1000),
    });
    console.log(`API: ${response.ok ? "responding" : "unreachable"} (port ${port})`);
  } catch {
    console.log(`API: unreachable (port ${port})`);
  }
}

export async function runService(argv: string[]): Promise<void> {
  const { action } = parseServiceArgs(argv);

  if (action === "status") {
    await printStatus();
    return;
  }

  let platform: ReturnType<typeof detectServicePlatform>;
  try {
    platform = detectServicePlatform();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (action === "install") {
    await (platform === "launchd" ? installLaunchd() : installSystemd());
    console.log(`Weave service installed (${platform}).`);
    return;
  }

  await (platform === "launchd" ? uninstallLaunchd() : uninstallSystemd());
  console.log(`Weave service uninstalled (${platform}).`);
}
