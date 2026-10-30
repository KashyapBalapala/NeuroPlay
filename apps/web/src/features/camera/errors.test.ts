import { describe, expect, test } from "vitest";

import { cameraStatusFromError, checkCameraSupport } from "./errors";

describe("cameraStatusFromError", () => {
  test.each([
    ["NotAllowedError", "permission-denied"],
    ["SecurityError", "permission-denied"],
    ["NotFoundError", "not-found"],
    ["OverconstrainedError", "not-found"],
    ["NotReadableError", "in-use"],
    ["AbortError", "error"],
  ])("maps %s to %s", (name, expected) => {
    expect(cameraStatusFromError(new DOMException("failed", name))).toBe(
      expected,
    );
  });

  test("maps an unknown DOMException name to error", () => {
    expect(
      cameraStatusFromError(new DOMException("failed", "SomethingNewError")),
    ).toBe("error");
  });

  test.each([new Error("boom"), "boom", null, undefined])(
    "maps a non-DOMException value (%s) to error",
    (value) => {
      expect(cameraStatusFromError(value)).toBe("error");
    },
  );
});

describe("checkCameraSupport", () => {
  const mediaDevices = { getUserMedia: () => {} } as unknown as MediaDevices;

  test("reports an insecure context", () => {
    expect(checkCameraSupport({ isSecureContext: false, mediaDevices })).toBe(
      "insecure-context",
    );
  });

  test("reports missing mediaDevices as unsupported", () => {
    expect(
      checkCameraSupport({ isSecureContext: true, mediaDevices: undefined }),
    ).toBe("unsupported");
  });

  test("reports mediaDevices without getUserMedia as unsupported", () => {
    expect(
      checkCameraSupport({
        isSecureContext: true,
        mediaDevices: {} as MediaDevices,
      }),
    ).toBe("unsupported");
  });

  test("allows a secure context with getUserMedia", () => {
    expect(checkCameraSupport({ isSecureContext: true, mediaDevices })).toBe(
      null,
    );
  });
});
