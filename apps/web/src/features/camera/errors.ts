import type { CameraStatus } from "./types";

type CameraEnvironment = {
  isSecureContext: boolean;
  mediaDevices: MediaDevices | undefined;
};

/** Returns a blocking status if getUserMedia cannot be called, otherwise null. */
export function checkCameraSupport({
  isSecureContext,
  mediaDevices,
}: CameraEnvironment): CameraStatus | null {
  // Browsers hide navigator.mediaDevices on insecure origins, so check this first.
  if (!isSecureContext) return "insecure-context";
  if (typeof mediaDevices?.getUserMedia !== "function") return "unsupported";
  return null;
}

/** Maps a getUserMedia rejection to a CameraStatus. */
export function cameraStatusFromError(error: unknown): CameraStatus {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? error.name
      : undefined;

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "permission-denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "not-found";
    case "NotReadableError":
      return "in-use";
    default:
      // AbortError and anything unexpected.
      return "error";
  }
}
