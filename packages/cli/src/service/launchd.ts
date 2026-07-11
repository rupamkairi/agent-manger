import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const LABEL = "org.weave.server";

export interface LaunchdContext {
  bunPath: string;
  cliEntry: string;
  weaveHome: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderPlist({ bunPath, cliEntry, weaveHome }: LaunchdContext): string {
  const outLog = join(weaveHome, "logs", "server.out.log");
  const errLog = join(weaveHome, "logs", "server.err.log");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(bunPath)}</string>
    <string>${escapeXml(cliEntry)}</string>
    <string>serve</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>WEAVE_HOME</key>
    <string>${escapeXml(weaveHome)}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(outLog)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(errLog)}</string>
</dict>
</plist>
`;
}

function plistPath(): string {
  return join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
}

function context(): LaunchdContext {
  const bunPath = process.execPath;
  const cliEntry = fileURLToPath(new URL("../index.ts", import.meta.url));
  const weaveHome = process.env.WEAVE_HOME ?? join(homedir(), ".weave");
  return { bunPath, cliEntry, weaveHome };
}

async function run(cmd: string[]): Promise<number> {
  const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  return proc.exited;
}

export async function installLaunchd(): Promise<void> {
  const { bunPath, cliEntry, weaveHome } = context();
  mkdirSync(join(weaveHome, "logs"), { recursive: true });

  const plist = renderPlist({ bunPath, cliEntry, weaveHome });
  const path = plistPath();
  mkdirSync(join(homedir(), "Library", "LaunchAgents"), { recursive: true });
  writeFileSync(path, plist);

  const uid = process.getuid?.() ?? 0;
  await run(["launchctl", "bootout", `gui/${uid}/${LABEL}`]);
  await run(["launchctl", "bootstrap", `gui/${uid}`, path]);
}

export async function uninstallLaunchd(): Promise<void> {
  const uid = process.getuid?.() ?? 0;
  await run(["launchctl", "bootout", `gui/${uid}/${LABEL}`]);
  try {
    unlinkSync(plistPath());
  } catch {
    // ignore — best effort
  }
}

export async function launchdStatus(): Promise<{ registered: boolean }> {
  const uid = process.getuid?.() ?? 0;
  const code = await run(["launchctl", "print", `gui/${uid}/${LABEL}`]);
  return { registered: code === 0 };
}
