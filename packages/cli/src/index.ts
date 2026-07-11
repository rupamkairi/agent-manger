#!/usr/bin/env bun
import { runServe } from "./commands/serve";
import { runService } from "./commands/service";

const HELP = `Weave CLI

Usage: weave <command> [options]

Commands:
  serve             Start the Weave server
    --port <n>        Port to listen on (default: 3000)
    --db <path>       Path to the database file
    --headless        Run without opening the web UI
  service <action>  Manage the Weave OS service
    install             Install and start the service
    uninstall           Stop and remove the service
    status              Show service, process, and API status
  mcp               Start the Weave MCP server
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
      const { runMcpServer } = await import("@weave/mcp");
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
