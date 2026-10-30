import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

import { patientHand } from "./handedness";
import type { Delegate, HandFrame } from "./types";

// Both are served from this app's own origin (see scripts/copy-mediapipe-wasm.mjs
// and docs/models.md); nothing is loaded from a CDN.
const WASM_BASE_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/models/hand_landmarker.task";

export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

export type HandTracker = {
  delegate: Delegate;
  detect(video: HTMLVideoElement, timestamp: number): HandFrame;
  close(): void;
};

export function toHandFrame(
  result: HandLandmarkerResult,
  timestamp: number,
  inferenceMs: number,
): HandFrame {
  return {
    timestamp,
    inferenceMs,
    hands: result.landmarks.map((landmarks, index) => {
      const category = result.handedness[index]?.[0];
      const label = category?.categoryName ?? "";
      return {
        landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
        worldLandmarks: (result.worldLandmarks[index] ?? []).map(
          ({ x, y, z }) => ({ x, y, z }),
        ),
        handedness: { label, score: category?.score ?? 0 },
        hand: patientHand(label),
      };
    }),
  };
}

/** Creates a VIDEO-mode hand landmarker, preferring the GPU delegate. */
export async function createHandTracker({
  numHands = 1,
}: { numHands?: number } = {}): Promise<HandTracker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_PATH);
  const create = (delegate: Delegate) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: "VIDEO",
      numHands,
    });

  let delegate: Delegate = "GPU";
  let landmarker: HandLandmarker;
  try {
    landmarker = await create("GPU");
  } catch {
    delegate = "CPU";
    landmarker = await create("CPU");
  }

  return {
    delegate,
    detect(video, timestamp) {
      const startedAt = performance.now();
      const result = landmarker.detectForVideo(video, timestamp);
      return toHandFrame(result, timestamp, performance.now() - startedAt);
    },
    close() {
      landmarker.close();
    },
  };
}
