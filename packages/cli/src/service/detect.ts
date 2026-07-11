export type ServicePlatform = "launchd" | "systemd";

export function detectServicePlatform(): ServicePlatform {
  switch (process.platform) {
    case "darwin":
      return "launchd";
    case "linux":
      return "systemd";
    default:
      throw new Error(
        `Unsupported platform for service management: ${process.platform} (only macOS/launchd and Linux/systemd are supported)`,
      );
  }
}
