export type ReadPermissionApi = {
  query(descriptor: Deno.PermissionDescriptor): Promise<Deno.PermissionStatus>;
  request(descriptor: Deno.PermissionDescriptor): Promise<Deno.PermissionStatus>;
};

export type ReadAccessStatus = "granted" | "denied";

export async function ensureReadAccess(path: string, permissions: ReadPermissionApi = Deno.permissions): Promise<ReadAccessStatus> {
  const descriptor: Deno.PermissionDescriptor = { name: "read", path } satisfies Deno.PermissionDescriptor;
  const current = await permissions.query(descriptor);

  if (current.state === "granted") {
    return "granted";
  }

  if (current.state === "denied") {
    return "denied";
  }

  const requested = await permissions.request(descriptor);
  return requested.state === "granted" ? "granted" : "denied";
}
