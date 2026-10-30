import type { CameraStatus } from "./types";

export type CameraStatusMessage = {
  title: string;
  help?: string;
  canRetry?: boolean;
};

/** Plain-language message and next step for every camera status. */
export const CAMERA_MESSAGES: Record<CameraStatus, CameraStatusMessage> = {
  idle: { title: "The camera is off." },
  requesting: {
    title: "Starting the camera…",
    help: "If your browser asks for permission, choose Allow.",
  },
  active: { title: "The camera is on." },
  "permission-denied": {
    title: "Camera access is blocked.",
    help: "Click the camera or lock icon in the address bar, set Camera to Allow for this site, then press Try again. You may need to reload the page.",
    canRetry: true,
  },
  "not-found": {
    title: "No camera was found.",
    help: "Connect a camera or check that it is switched on, then press Try again.",
    canRetry: true,
  },
  "in-use": {
    title: "The camera is being used by another app.",
    help: "Close other apps or browser tabs that may use the camera, such as video call apps, then press Try again.",
    canRetry: true,
  },
  "insecure-context": {
    title: "Camera access needs a secure connection.",
    help: "Open this page over HTTPS, or on localhost during development.",
  },
  unsupported: {
    title: "This browser does not support camera access.",
    help: "Try a current version of Chrome, Edge, Firefox or Safari.",
  },
  disconnected: {
    title: "The camera stopped unexpectedly.",
    help: "It may have been unplugged, switched off or blocked. Reconnect it, then press Try again.",
    canRetry: true,
  },
  error: {
    title: "Something went wrong while starting the camera.",
    help: "Press Try again. If the problem continues, reload the page or restart your browser.",
    canRetry: true,
  },
};
