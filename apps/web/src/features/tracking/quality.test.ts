import { describe, expect, test } from "vitest";

import {
  classifyFrame,
  computeStats,
  type FrameSample,
  rollingWindow,
} from "./quality";
import type { HandFrame } from "./types";

function frameWithScore(score: number | null): HandFrame {
  return {
    timestamp: 0,
    inferenceMs: 5,
    hands:
      score === null
        ? []
        : [
            {
              landmarks: [],
              worldLandmarks: [],
              handedness: { label: "Right", score },
              hand: "right",
            },
          ],
  };
}

describe("classifyFrame", () => {
  test("no hand", () => {
    expect(classifyFrame(frameWithScore(null))).toBe("no-hand");
  });

  test("low confidence below the default threshold", () => {
    expect(classifyFrame(frameWithScore(0.79))).toBe("low-confidence");
  });

  test("tracking at or above the default threshold", () => {
    expect(classifyFrame(frameWithScore(0.8))).toBe("tracking");
    expect(classifyFrame(frameWithScore(0.99))).toBe("tracking");
  });

  test("uses a configurable threshold", () => {
    expect(classifyFrame(frameWithScore(0.6), 0.5)).toBe("tracking");
    expect(classifyFrame(frameWithScore(0.95), 0.97)).toBe("low-confidence");
  });
});

describe("rolling statistics", () => {
  const sample = (
    time: number,
    inferenceMs = 10,
    handPresent = true,
  ): FrameSample => ({ time, inferenceMs, handPresent });

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

  test("computes average and maximum inference time", () => {
    const stats = computeStats([sample(0, 4), sample(33, 10), sample(66, 7)]);
    expect(stats.avgInferenceMs).toBeCloseTo(7);
    expect(stats.maxInferenceMs).toBe(10);
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
      trackingLosses: 0,
    });
    expect(computeStats([sample(0, 8)]).fps).toBe(0);
  });
});
