import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const UNIT_NAME = "weave";

export interface SystemdContext {
  bunPath: string;
  cliEntry: string;
  weaveHome: string;
}

export function renderUnit({ bunPath, cliEntry, weaveHome }: SystemdContext): string {
  return `[Unit]
Description=Weave server

[Service]
ExecStart=${bunPath} ${cliEntry} serve
Restart=on-failure
RestartSec=5
Environment=WEAVE_HOME=${weaveHome}

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
  const weaveHome = process.env.WEAVE_HOME ?? join(homedir(), ".weave");
  return { bunPath, cliEntry, weaveHome };
}

async function run(cmd: string[]): Promise<number> {
  const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  return proc.exited;
}

export async function installSystemd(): Promise<void> {
  const { bunPath, cliEntry, weaveHome } = context();
  mkdirSync(join(weaveHome, "logs"), { recursive: true });

  const unit = renderUnit({ bunPath, cliEntry, weaveHome });
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
