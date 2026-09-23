import { installSignalHandlers, startApp } from "./app";

// Dev entry: API only. Run the web UI separately (`bun run dev:web`, port 11124).
const app = await startApp({ headless: true });
installSignalHandlers(app);
