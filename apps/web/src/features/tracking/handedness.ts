import type { Hand } from "./types";

/**
 * Converts MediaPipe's handedness label to the patient's actual hand.
 *
 * MediaPipe Tasks reports handedness for the subject's own hands when the input
 * is NOT mirrored:
 *
 *   "Note: Left and Right handedness correspond to the subject's hands, not the
 *   viewer. Passing a horizontally mirrored image will invert these outputs."
 *   (mediapipe/tasks/web/vision/hand_landmarker/hand_landmarker_result.d.ts,
 *   google-ai-edge/mediapipe commit 8c2f96c, issue #6376; behaviour since
 *   v0.10.5, "Swap left and right hand labels", issue #4724)
 *
 * The legacy MediaPipe Hands docs state the opposite ("handedness is determined
 * assuming the input image is mirrored"); that applies only to the legacy
 * solution, not to the Tasks API used here.
 *
 * Our frames are not mirrored (only the preview is, with CSS), so labels are
 * used as they are. Pass `inputMirrored` only if frames are ever flipped
 * before detection.
 */
export function patientHand(label: string, inputMirrored = false): Hand | null {
  const hand = label === "Left" ? "left" : label === "Right" ? "right" : null;
  if (hand === null || !inputMirrored) return hand;
  return hand === "left" ? "right" : "left";
}
