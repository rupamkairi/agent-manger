export type ShellCommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type ShellCommandRunner = (command: string, args: string[]) => Promise<ShellCommandResult>;

export async function resolveHomeDirectory(
  run: ShellCommandRunner = defaultRun,
  envHome = Deno.env.get("HOME") ?? "",
): Promise<string> {
  const normalizedEnvHome = normalizeHomeDirectory(envHome);

  if (normalizedEnvHome) {
    return normalizedEnvHome;
  }

  try {
    const output = await run("bash", ["-lc", 'printf %s "$HOME"']);

    if (output.code !== 0) {
      return "";
    }

    return normalizeHomeDirectory(output.stdout);
  } catch {
    return "";
  }
}

export function normalizeHomeDirectory(home: string) {
  return home.trim().replace(/\/+$/, "");
}

async function defaultRun(command: string, args: string[]): Promise<ShellCommandResult> {
  const output = await new Deno.Command(command, { args }).output();

  return {
    code: output.code,
    stdout: new TextDecoder().decode(output.stdout),
    stderr: new TextDecoder().decode(output.stderr),
  };
}
