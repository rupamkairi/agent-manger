#!/usr/bin/env bun
import { runMcpServer } from "./server";

runMcpServer().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
