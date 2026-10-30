export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "permission-denied"
  | "not-found"
  | "in-use"
  | "insecure-context"
  | "unsupported"
  | "disconnected"
  | "error";

/** Actual values reported by the browser via MediaStreamTrack.getSettings(). */
export type CameraSettings = {
  width?: number;
  height?: number;
  frameRate?: number;
  deviceId?: string;
};
