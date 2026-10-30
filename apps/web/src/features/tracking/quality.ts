import type { FrameQuality, HandFrame, TrackingStats } from "./types";

/**
 * Thresholds for classifying a frame. These describe what the camera sees;
 * they are observations for guiding the user, not measures of accuracy.
 */
export const QUALITY_THRESHOLDS = {
  /**
   * Minimum fraction of the 21 landmarks inside the frame. 1 means every
   * landmark must be visible: MediaPipe still estimates points beyond the
   * frame edge, but those are guesses, and finger exercises need all fingers.
   */
  minCoverage: 1,
  /**
   * Minimum hand size: the larger side of the landmark bounding box as a
   * fraction of the frame's width or height. An open hand about an arm's
   * length from a laptop camera fills roughly 0.3–0.4; below 0.2 the hand is
   * only a few dozen pixels across at 640 × 480. A starting value, to be tuned
   * with real users.
   */
  minHandSize: 0.2,
  /**
   * Minimum handedness score (0..1). MediaPipe's web API exposes no per-hand
   * presence score; a low handedness score usually means a blurred, dark or
   * edge-on hand.
   */
  minHandednessConfidence: 0.8,
};

export type QualityThresholds = typeof QUALITY_THRESHOLDS;

type NormalizedPoint = { x: number; y: number };

/** Fraction of landmarks inside the frame (normalized x and y within 0..1). */
export function landmarkCoverage(landmarks: NormalizedPoint[]): number {
  if (landmarks.length === 0) return 0;
  const inside = landmarks.filter(
    ({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1,
  ).length;
  return inside / landmarks.length;
}

/**
 * Hand size relative to the frame: the larger of the landmark bounding box's
 * width (as a fraction of frame width) and height (fraction of frame height).
 */
export function handSize(landmarks: NormalizedPoint[]): number {
  if (landmarks.length === 0) return 0;
  const xs = landmarks.map(({ x }) => x);
  const ys = landmarks.map(({ y }) => y);
  return Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
}

/** Classifies the first detected hand, most actionable problem first. */
export function classifyFrame(
  frame: HandFrame,
  thresholds: QualityThresholds = QUALITY_THRESHOLDS,
): FrameQuality {
  const hand = frame.hands[0];
  if (!hand) return "no-hand";
  if (landmarkCoverage(hand.landmarks) < thresholds.minCoverage) {
    return "partly-out-of-frame";
  }
  if (handSize(hand.landmarks) < thresholds.minHandSize) return "too-far";
  if (hand.handedness.score < thresholds.minHandednessConfidence) {
    return "low-handedness-confidence";
  }
  return "tracking";
}

/** Length of the rolling statistics window. */
export const STATS_WINDOW_MS = 5000;

export type FrameSample = {
  /** performance.now() when the frame was processed (ms). */
  time: number;
  inferenceMs: number;
  /** Detection plus overlay drawing (ms). */
  loopMs: number;
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
    return {
      fps: 0,
      avgInferenceMs: 0,
      maxInferenceMs: 0,
      avgLoopMs: 0,
      maxLoopMs: 0,
      trackingLosses: 0,
    };
  }

  const spanMs = samples[samples.length - 1].time - samples[0].time;
  let inferenceTotal = 0;
  let inferenceMax = 0;
  let loopTotal = 0;
  let loopMax = 0;
  let losses = 0;
  samples.forEach((sample, index) => {
    inferenceTotal += sample.inferenceMs;
    inferenceMax = Math.max(inferenceMax, sample.inferenceMs);
    loopTotal += sample.loopMs;
    loopMax = Math.max(loopMax, sample.loopMs);
    if (index > 0 && samples[index - 1].handPresent && !sample.handPresent) {
      losses++;
    }
  });

  return {
    fps: spanMs > 0 ? ((samples.length - 1) * 1000) / spanMs : 0,
    avgInferenceMs: inferenceTotal / samples.length,
    maxInferenceMs: inferenceMax,
    avgLoopMs: loopTotal / samples.length,
    maxLoopMs: loopMax,
    trackingLosses: losses,
  };
}
