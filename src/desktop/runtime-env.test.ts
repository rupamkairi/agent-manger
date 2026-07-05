import { normalizeHomeDirectory, resolveHomeDirectory } from "./runtime-env.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("resolveHomeDirectory prefers env HOME when present", async () => {
  const home = await resolveHomeDirectory(async () => ({
    code: 1,
    stdout: "",
    stderr: "should not run",
  }), "/Users/tester/");

  assertEquals(home, "/Users/tester");
});

Deno.test("resolveHomeDirectory falls back to shell HOME when env HOME is empty", async () => {
  const home = await resolveHomeDirectory(async () => ({
    code: 0,
    stdout: "/Users/fallback\n",
    stderr: "",
  }), "");

  assertEquals(home, "/Users/fallback");
});

Deno.test("normalizeHomeDirectory trims trailing slashes", () => {
  assertEquals(normalizeHomeDirectory("/Users/tester///"), "/Users/tester");
});
