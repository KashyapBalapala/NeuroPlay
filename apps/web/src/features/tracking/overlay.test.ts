import { expect, test } from "vitest";

import { toCanvasPoint } from "./overlay";

test("maps normalized coordinates to canvas pixels", () => {
  expect(toCanvasPoint({ x: 0.25, y: 0.5 }, 640, 480, false)).toEqual({
    x: 160,
    y: 240,
  });
});

test("flips x when the preview is mirrored, leaving y unchanged", () => {
  expect(toCanvasPoint({ x: 0.25, y: 0.5 }, 640, 480, true)).toEqual({
    x: 480,
    y: 240,
  });
  expect(toCanvasPoint({ x: 0, y: 0 }, 640, 480, true)).toEqual({
    x: 640,
    y: 0,
  });
  expect(toCanvasPoint({ x: 1, y: 1 }, 640, 480, true)).toEqual({
    x: 0,
    y: 480,
  });
});
