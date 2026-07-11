import { installSignalHandlers, startApp } from "./app";

const app = await startApp();
installSignalHandlers(app);
