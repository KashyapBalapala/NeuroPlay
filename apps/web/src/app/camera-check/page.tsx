"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { CameraPreview } from "@/features/camera/CameraPreview";
import type { CameraSettings, CameraStatus } from "@/features/camera/types";
import { useCamera } from "@/features/camera/useCamera";

type StatusMessage = {
  title: string;
  help?: string;
  canRetry?: boolean;
};

const MESSAGES: Record<CameraStatus, StatusMessage> = {
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

const BUTTON =
  "rounded border border-current px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

function describeSettings({ width, height, frameRate }: CameraSettings): string {
  const size = width && height ? `${width} × ${height}` : "unknown size";
  const fps = frameRate ? `${Math.round(frameRate)} fps` : "unknown frame rate";
  return `${size} at ${fps}`;
}

export default function CameraCheckPage() {
  const { status, stream, settings, devices, start, stop, switchDevice } =
    useCamera();
  const message = MESSAGES[status];
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const isFirstRender = useRef(true);

  // The focused button disappears when the status changes; move keyboard
  // focus to the button for the new state instead of dropping it on <body>.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (document.activeElement === document.body) {
      primaryButtonRef.current?.focus();
    }
  }, [status]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <Link
        href="/"
        className="self-start underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Back to home
      </Link>
      <h1 className="text-3xl font-semibold">Camera check</h1>
      <p>
        Check that your camera works. The video stays on this device: it is
        never uploaded, recorded or saved.
      </p>

      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        <p className="font-medium">{message.title}</p>
        {message.help && <p>{message.help}</p>}
        {status === "active" && settings && (
          <p>Camera running at {describeSettings(settings)}.</p>
        )}
      </div>

      {status === "idle" && (
        <button
          ref={primaryButtonRef}
          type="button"
          className={BUTTON}
          onClick={() => void start()}
        >
          Start camera
        </button>
      )}

      {message.canRetry && (
        <button
          ref={primaryButtonRef}
          type="button"
          className={BUTTON}
          onClick={() => void start()}
        >
          Try again
        </button>
      )}

      {status === "active" && stream && (
        <div className="flex flex-col gap-4">
          <CameraPreview stream={stream} />

          {devices.length > 1 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="camera-device" className="font-medium">
                Camera
              </label>
              <select
                id="camera-device"
                className="rounded border border-current px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                value={settings?.deviceId ?? ""}
                onChange={(event) => void switchDevice(event.target.value)}
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            ref={primaryButtonRef}
            type="button"
            className={BUTTON}
            onClick={stop}
          >
            Stop camera
          </button>
        </div>
      )}
    </main>
  );
}
