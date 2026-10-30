import { describe, expect, test } from "vitest";

import {
  classifyFrame,
  computeStats,
  type FrameSample,
  handSize,
  landmarkCoverage,
  QUALITY_THRESHOLDS,
  rollingWindow,
} from "./quality";
import type { HandFrame, Point } from "./types";

/**
 * 21 landmarks along the diagonal of a size × size box whose top-left corner
 * is `corner`. With the default corner (0, 0) the box spans exactly `size`,
 * which keeps boundary tests free of floating-point rounding.
 */
function handInBox(size: number, corner = { x: 0, y: 0 }): Point[] {
  return Array.from({ length: 21 }, (_, i) => ({
    x: corner.x + (i / 20) * size,
    y: corner.y + (i / 20) * size,
    z: 0,
  }));
}

function frame(landmarks: Point[] | null, score = 0.95): HandFrame {
  return {
    timestamp: 0,
    inferenceMs: 5,
    hands:
      landmarks === null
        ? []
        : [
            {
              landmarks,
              worldLandmarks: [],
              handedness: { label: "Right", score },
              hand: "right",
            },
          ],
  };
}

describe("landmarkCoverage", () => {
  test("is 1 when every landmark is inside the frame", () => {
    expect(landmarkCoverage(handInBox(0.4))).toBe(1);
  });

  test("counts points exactly on the frame edge as inside", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ];
    expect(landmarkCoverage(points)).toBe(1);
  });

  test("counts points just outside the frame as outside", () => {
    const points = [
      { x: -0.001, y: 0.5 },
      { x: 1.001, y: 0.5 },
      { x: 0.5, y: -0.001 },
      { x: 0.5, y: 1.001 },
    ];
    expect(landmarkCoverage(points)).toBe(0);
  });

  test("returns the fraction inside", () => {
    const points = handInBox(0.4);
    points[0] = { x: 1.2, y: 0.5, z: 0 };
    points[1] = { x: 0.5, y: -0.1, z: 0 };
    expect(landmarkCoverage(points)).toBeCloseTo(19 / 21);
  });

  test("is 0 for no landmarks", () => {
    expect(landmarkCoverage([])).toBe(0);
  });
});

describe("handSize", () => {
  test("is the larger side of the bounding box", () => {
    const points = [
      { x: 0.2, y: 0.4 },
      { x: 0.5, y: 0.5 },
    ];
    expect(handSize(points)).toBeCloseTo(0.3);
  });

  test("uses height when it is the larger side", () => {
    const points = [
      { x: 0.4, y: 0.1 },
      { x: 0.5, y: 0.6 },
    ];
    expect(handSize(points)).toBeCloseTo(0.5);
  });

  test("is 0 for no landmarks", () => {
    expect(handSize([])).toBe(0);
  });
});

describe("classifyFrame", () => {
  const { minHandSize, minHandednessConfidence } = QUALITY_THRESHOLDS;

  test("no hand", () => {
    expect(classifyFrame(frame(null))).toBe("no-hand");
  });

  test("tracking for a large, fully visible, confidently labelled hand", () => {
    expect(classifyFrame(frame(handInBox(0.4)))).toBe("tracking");
  });

  test("partly out of frame when one landmark is outside", () => {
    const points = handInBox(0.4);
    points[20] = { x: 1.01, y: 0.5, z: 0 };
    expect(classifyFrame(frame(points))).toBe("partly-out-of-frame");
  });

  test("too far just below the minimum hand size, tracking at it", () => {
    expect(classifyFrame(frame(handInBox(minHandSize - 0.001)))).toBe(
      "too-far",
    );
    expect(classifyFrame(frame(handInBox(minHandSize)))).toBe("tracking");
  });

  test("low handedness confidence just below the threshold, tracking at it", () => {
    const points = handInBox(0.4);
    expect(
      classifyFrame(frame(points, minHandednessConfidence - 0.001)),
    ).toBe("low-handedness-confidence");
    expect(classifyFrame(frame(points, minHandednessConfidence))).toBe(
      "tracking",
    );
  });

  test("reports the most actionable problem first", () => {
    const smallOutside = handInBox(0.1, { x: 0.95, y: 0.5 });
    expect(classifyFrame(frame(smallOutside, 0.1))).toBe(
      "partly-out-of-frame",
    );
    expect(classifyFrame(frame(handInBox(0.1), 0.1))).toBe("too-far");
  });

  test("uses custom thresholds", () => {
    const thresholds = {
      minCoverage: 0.9,
      minHandSize: 0.05,
      minHandednessConfidence: 0.5,
    };
    const points = handInBox(0.1);
    points[0] = { x: -0.1, y: 0.5, z: 0 }; // 20 of 21 inside
    expect(classifyFrame(frame(points, 0.6), thresholds)).toBe("tracking");
  });
});

describe("rolling statistics", () => {
  const sample = (
    time: number,
    inferenceMs = 10,
    handPresent = true,
    loopMs = inferenceMs + 1,
  ): FrameSample => ({ time, inferenceMs, loopMs, handPresent });

  test("rollingWindow drops samples older than the window", () => {
    let samples: FrameSample[] = [];
    for (const time of [0, 1000, 2000, 6500]) {
      samples = rollingWindow(samples, sample(time), 5000);
    }
    expect(samples.map((s) => s.time)).toEqual([2000, 6500]);
  });

  test("computes fps from the time span of the samples", () => {
    // 31 samples 1000/30 ms apart = 30 intervals in one second.
    const samples = Array.from({ length: 31 }, (_, i) =>
      sample((i * 1000) / 30),
    );
    expect(computeStats(samples).fps).toBeCloseTo(30);
  });

  test("computes average and maximum inference and loop time", () => {
    const stats = computeStats([
      sample(0, 4, true, 6),
      sample(33, 10, true, 15),
      sample(66, 7, true, 9),
    ]);
    expect(stats.avgInferenceMs).toBeCloseTo(7);
    expect(stats.maxInferenceMs).toBe(10);
    expect(stats.avgLoopMs).toBeCloseTo(10);
    expect(stats.maxLoopMs).toBe(15);
  });

  test("counts hand present -> absent transitions as tracking losses", () => {
    const presence = [true, false, false, true, true, false, true];
    const samples = presence.map((present, i) => sample(i * 33, 5, present));
    expect(computeStats(samples).trackingLosses).toBe(2);
  });

  test("does not count a hand that was never present as lost", () => {
    const samples = [false, false, true].map((p, i) => sample(i * 33, 5, p));
    expect(computeStats(samples).trackingLosses).toBe(0);
  });

  test("handles empty and single-sample windows", () => {
    expect(computeStats([])).toEqual({
      fps: 0,
      avgInferenceMs: 0,
      maxInferenceMs: 0,
      avgLoopMs: 0,
      maxLoopMs: 0,
      trackingLosses: 0,
    });
    expect(computeStats([sample(0, 8)]).fps).toBe(0);
  });
});
