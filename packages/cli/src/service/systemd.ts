import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const UNIT_NAME = "harbor";

export interface SystemdContext {
  bunPath: string;
  cliEntry: string;
  harborHome: string;
}

export function renderUnit({ bunPath, cliEntry, harborHome }: SystemdContext): string {
  return `[Unit]
Description=Harbor server

[Service]
ExecStart=${bunPath} ${cliEntry} serve
Restart=on-failure
RestartSec=5
Environment=HARBOR_HOME=${harborHome}

[Install]
WantedBy=default.target
`;
}

function unitPath(): string {
  return join(homedir(), ".config", "systemd", "user", `${UNIT_NAME}.service`);
}

function context(): SystemdContext {
  const bunPath = process.execPath;
  const cliEntry = fileURLToPath(new URL("../index.ts", import.meta.url));
  const harborHome = process.env.HARBOR_HOME ?? join(homedir(), ".harbor");
  return { bunPath, cliEntry, harborHome };
}

async function run(cmd: string[]): Promise<number> {
  const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  return proc.exited;
}

export async function installSystemd(): Promise<void> {
  const { bunPath, cliEntry, harborHome } = context();
  mkdirSync(join(harborHome, "logs"), { recursive: true });

  const unit = renderUnit({ bunPath, cliEntry, harborHome });
  const path = unitPath();
  mkdirSync(join(homedir(), ".config", "systemd", "user"), { recursive: true });
  writeFileSync(path, unit);

  await run(["systemctl", "--user", "daemon-reload"]);
  await run(["systemctl", "--user", "enable", "--now", UNIT_NAME]);
}

export async function uninstallSystemd(): Promise<void> {
  await run(["systemctl", "--user", "disable", "--now", UNIT_NAME]);
  try {
    unlinkSync(unitPath());
  } catch {
    // ignore — best effort
  }
  await run(["systemctl", "--user", "daemon-reload"]);
}

export async function systemdStatus(): Promise<{ registered: boolean }> {
  const code = await run(["systemctl", "--user", "is-active", UNIT_NAME]);
  return { registered: code === 0 };
}
