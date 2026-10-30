import { expect, test } from "vitest";

import { patientHand } from "./handedness";

test("uses MediaPipe labels as they are for unmirrored frames", () => {
  expect(patientHand("Left")).toBe("left");
  expect(patientHand("Right")).toBe("right");
});

test("swaps labels when the frames sent to MediaPipe are mirrored", () => {
  expect(patientHand("Left", true)).toBe("right");
  expect(patientHand("Right", true)).toBe("left");
});

test("returns null for an unknown label", () => {
  expect(patientHand("")).toBeNull();
  expect(patientHand("left")).toBeNull();
  expect(patientHand("Unknown", true)).toBeNull();
});
