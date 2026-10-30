// @vitest-environment node
import { expect, test } from "vitest";

import nextConfig from "../next.config";

// These headers enforce the privacy rules in docs/privacy.md. Loosening them
// must be a deliberate change that also updates this test.
test("every route sends the privacy headers", async () => {
  const rules = (await nextConfig.headers?.()) ?? [];
  const rule = rules.find(({ source }) => source === "/:path*");
  expect(rule, "no header rule for /:path*").toBeDefined();

  const headers = new Map(
    rule!.headers.map(({ key, value }) => [key.toLowerCase(), value]),
  );

  expect(headers.get("permissions-policy")).toBe(
    "camera=(self), microphone=(), geolocation=()",
  );

  const directives = new Map(
    (headers.get("content-security-policy") ?? "")
      .split(";")
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name, sources]),
  );
  expect(directives.get("connect-src")).toEqual(["'self'"]);
});
