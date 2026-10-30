// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { expect, test } from "vitest";

const MODEL_FILE = new URL(
  "../../../public/models/hand_landmarker.task",
  import.meta.url,
);
const MODELS_DOC = new URL("../../../../../docs/models.md", import.meta.url);

test("hand_landmarker.task matches the SHA-256 recorded in docs/models.md", async () => {
  const doc = await readFile(MODELS_DOC, "utf8");
  const expected = doc.match(/SHA-256 \| `([0-9a-f]{64})`/)?.[1];
  expect(expected, "SHA-256 row not found in docs/models.md").toBeDefined();

  const actual = createHash("sha256")
    .update(await readFile(MODEL_FILE))
    .digest("hex");

  expect(actual).toBe(expected);
});
