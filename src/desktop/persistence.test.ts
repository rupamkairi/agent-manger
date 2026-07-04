import type { PersistedAppState } from "../shared/types/resource.ts";
import { getAppStatePath, loadAppStateFile, saveAppStateFile } from "./persistence.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("getAppStatePath uses macOS application support location", () => {
  assertEquals(
    getAppStatePath("/Users/tester"),
    "/Users/tester/Library/Application Support/com.rupamkairi.ai-resource-manager/state.json",
  );
});

Deno.test("loadAppStateFile returns null for missing file", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/missing.json`;

  assertEquals(await loadAppStateFile(path), null);
});

Deno.test("saveAppStateFile and loadAppStateFile round-trip selected project", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/state.json`;
  const state: PersistedAppState = {
    version: 1,
    selectedProjectId: "p-2",
    projects: [
      { id: "p-1", name: "One", path: "/tmp/one", lastScanned: "2026-07-05 10:00:00" },
      { id: "p-2", name: "Two", path: "/tmp/two", lastScanned: "2026-07-05 10:05:00" },
    ],
  };

  await saveAppStateFile(path, state);

  const loaded = await loadAppStateFile(path);

  if (!loaded) {
    throw new Error("Expected persisted state");
  }

  assertEquals(loaded.selectedProjectId, "p-2");
  assertEquals(loaded.projects.length, 2);
  assertEquals(loaded.projects[1]?.path, "/tmp/two");
});

Deno.test("loadAppStateFile returns null for empty file", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/state.json`;

  await Deno.writeTextFile(path, "");

  assertEquals(await loadAppStateFile(path), null);
});
