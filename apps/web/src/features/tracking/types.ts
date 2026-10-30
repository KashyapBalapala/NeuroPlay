export type Point = { x: number; y: number; z: number };

/** The patient's actual hand. */
export type Hand = "left" | "right";

export type TrackedHand = {
  /** 21 landmarks in normalized image coordinates (0..1) of the unmirrored frame. */
  landmarks: Point[];
  /** 21 landmarks in metres, origin at the hand's approximate geometric centre. */
  worldLandmarks: Point[];
  /** Raw MediaPipe handedness ("Left" / "Right") and its score (0..1). */
  handedness: { label: string; score: number };
  /** The patient's real hand derived from `handedness`, or null if unknown. */
  hand: Hand | null;
};

export type HandFrame = {
  /** Monotonic timestamp (ms) passed to detectForVideo. */
  timestamp: number;
  /** Time spent in detectForVideo for this frame (ms). */
  inferenceMs: number;
  hands: TrackedHand[];
};

export type TrackingStatus =
  | "loading-model"
  | "ready"
  | "tracking"
  | "no-hand"
  | "model-error";

export type Delegate = "GPU" | "CPU";

export type FrameQuality = "no-hand" | "low-confidence" | "tracking";

export type TrackingStats = {
  /** Processed (detected) frames per second. */
  fps: number;
  avgInferenceMs: number;
  maxInferenceMs: number;
  /** Hand present -> absent transitions within the window. */
  trackingLosses: number;
};
