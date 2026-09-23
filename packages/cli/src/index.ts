#!/usr/bin/env bun
import { runServe } from "./commands/serve";
import { runService } from "./commands/service";

const HELP = `Harbor CLI

Usage: harbor <command> [options]

Commands:
  serve             Start the Harbor API server (API only, port 11123)
    --port <n>        Port to listen on (default: 11123)
    --db <path>       Path to the database file
    --serve-ui        Also serve the built web UI from the same process
                      (default: off — run the web UI separately)
    --open             Open the UI in the default browser (pairs with --serve-ui)
  service <action>  Manage the Harbor OS service
    install             Install and start the service
    uninstall           Stop and remove the service
    status              Show service, process, and API status
  mcp               Start the Harbor MCP server
  --version, -v     Print the CLI version
`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "serve":
      await runServe(rest);
      return;
    case "service":
      await runService(rest);
      return;
    case "mcp": {
      const { runMcpServer } = await import("@harbor/mcp");
      await runMcpServer();
      return;
    }
    case "--version":
    case "-v": {
      const pkg = await import("../package.json");
      console.log(pkg.version);
      return;
    }
    default:
      console.log(HELP);
      return;
  }
}

void main();
