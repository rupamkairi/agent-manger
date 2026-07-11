import { parseArgs } from "node:util";

export interface ServeArgs {
  port?: number;
  db?: string;
  headless: boolean;
}

export interface ServiceArgs {
  action: "install" | "uninstall" | "status";
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export function parseServeArgs(argv: string[]): ServeArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      port: { type: "string" },
      db: { type: "string" },
      headless: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  let port: number | undefined;
  if (values.port !== undefined) {
    const parsed = Number(values.port);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      fail(`Invalid --port value: ${String(values.port)} (must be an integer 1-65535)`);
    }
    port = parsed;
  }

  return {
    port,
    db: typeof values.db === "string" ? values.db : undefined,
    headless: Boolean(values.headless),
  };
}

const SERVICE_HELP = `Usage: weave service <install|uninstall|status>`;

export function parseServiceArgs(argv: string[]): ServiceArgs {
  const { positionals } = parseArgs({
    args: argv,
    options: {},
    allowPositionals: true,
    strict: false,
  });

  const action = positionals[0];
  if (action !== "install" && action !== "uninstall" && action !== "status") {
    console.error(SERVICE_HELP);
    process.exit(1);
  }

  return { action };
}
