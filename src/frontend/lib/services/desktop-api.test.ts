import { desktopApi } from "./desktop-api.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("pickProjectFolder prefers bindings over browser fallback", async () => {
  const previousBindings = (globalThis as typeof globalThis & { bindings?: unknown }).bindings;
  const previousAgentManager = (globalThis as typeof globalThis & { agentManager?: unknown }).agentManager;
  let bindingCalls = 0;

  (globalThis as typeof globalThis & { bindings?: unknown }).bindings = {
    pickProjectFolder: async () => {
      bindingCalls += 1;
      return "/native/project";
    },
  };
  (globalThis as typeof globalThis & { agentManager?: unknown }).agentManager = {
    pickProjectFolder: async () => {
      throw new Error("browser fallback should not run when bindings exist");
    },
  } as never;

  try {
    const picked = await desktopApi.pickProjectFolder();
    assertEquals(picked, "/native/project");
    assertEquals(bindingCalls, 1);
  } finally {
    (globalThis as typeof globalThis & { bindings?: unknown }).bindings = previousBindings;
    (globalThis as typeof globalThis & { agentManager?: unknown }).agentManager = previousAgentManager;
  }
});

Deno.test("pickProjectFolder falls back to browser bridge when bindings are absent", async () => {
  const previousBindings = (globalThis as typeof globalThis & { bindings?: unknown }).bindings;
  const previousAgentManager = (globalThis as typeof globalThis & { agentManager?: unknown }).agentManager;

  delete (globalThis as typeof globalThis & { bindings?: unknown }).bindings;
  (globalThis as typeof globalThis & { agentManager?: unknown }).agentManager = {
    pickProjectFolder: async () => "/browser/project",
  } as never;

  try {
    const picked = await desktopApi.pickProjectFolder();
    assertEquals(picked, "/browser/project");
  } finally {
    (globalThis as typeof globalThis & { bindings?: unknown }).bindings = previousBindings;
    (globalThis as typeof globalThis & { agentManager?: unknown }).agentManager = previousAgentManager;
  }
});
