import type { FrameQuality, HandFrame, TrackingStats } from "./types";

/**
 * Handedness score below which a detected hand counts as low confidence.
 * MediaPipe's web API exposes no per-hand presence score, so the handedness
 * score is used as the confidence signal.
 */
export const DEFAULT_MIN_CONFIDENCE = 0.8;

/** Length of the rolling statistics window. */
export const STATS_WINDOW_MS = 5000;

export function classifyFrame(
  frame: HandFrame,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
): FrameQuality {
  const hand = frame.hands[0];
  if (!hand) return "no-hand";
  return hand.handedness.score < minConfidence ? "low-confidence" : "tracking";
}

export type FrameSample = {
  /** performance.now() when the frame was processed (ms). */
  time: number;
  inferenceMs: number;
  handPresent: boolean;
};

/** Appends a sample and drops samples older than `windowMs` before it. */
export function rollingWindow(
  samples: FrameSample[],
  sample: FrameSample,
  windowMs = STATS_WINDOW_MS,
): FrameSample[] {
  return [...samples, sample].filter((s) => sample.time - s.time <= windowMs);
}

export function computeStats(samples: FrameSample[]): TrackingStats {
  if (samples.length === 0) {
    return { fps: 0, avgInferenceMs: 0, maxInferenceMs: 0, trackingLosses: 0 };
  }

  const spanMs = samples[samples.length - 1].time - samples[0].time;
  let total = 0;
  let max = 0;
  let losses = 0;
  samples.forEach((sample, index) => {
    total += sample.inferenceMs;
    max = Math.max(max, sample.inferenceMs);
    if (index > 0 && samples[index - 1].handPresent && !sample.handPresent) {
      losses++;
    }
  });

  return {
    fps: spanMs > 0 ? ((samples.length - 1) * 1000) / spanMs : 0,
    avgInferenceMs: total / samples.length,
    maxInferenceMs: max,
    trackingLosses: losses,
  };
}
