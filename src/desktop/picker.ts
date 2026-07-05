type CommandRunner = (command: string, args: string[]) => Promise<Deno.CommandOutput>;

export async function pickProjectFolder(run: CommandRunner = defaultRun) {
  try {
    const output = await run("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Select a project folder")',
    ]);

    if (output.code !== 0) {
      return null;
    }

    return new TextDecoder().decode(output.stdout).trim().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function defaultRun(command: string, args: string[]) {
  return await new Deno.Command(command, { args }).output();
}
