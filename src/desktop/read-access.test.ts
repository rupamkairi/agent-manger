import { ensureReadAccess } from "./read-access.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function permissionStatus(state: Deno.PermissionState): Deno.PermissionStatus {
  return {
    state,
    partial: false,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
  } as unknown as Deno.PermissionStatus;
}

Deno.test("ensureReadAccess returns granted when query is already granted", async () => {
  const access = await ensureReadAccess("/tmp/test", {
    query: async () => permissionStatus("granted"),
    request: async () => permissionStatus("denied"),
  });

  assertEquals(access, "granted");
});

Deno.test("ensureReadAccess requests permission when query is prompt", async () => {
  const access = await ensureReadAccess("/tmp/test", {
    query: async () => permissionStatus("prompt"),
    request: async () => permissionStatus("granted"),
  });

  assertEquals(access, "granted");
});

Deno.test("ensureReadAccess returns denied when request is denied", async () => {
  const access = await ensureReadAccess("/tmp/test", {
    query: async () => permissionStatus("prompt"),
    request: async () => permissionStatus("denied"),
  });

  assertEquals(access, "denied");
});
