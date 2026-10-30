"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { CameraPreview } from "@/features/camera/CameraPreview";
import { CAMERA_MESSAGES } from "@/features/camera/messages";
import type { CameraSettings } from "@/features/camera/types";
import { useCamera } from "@/features/camera/useCamera";

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
  const message = CAMERA_MESSAGES[status];
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
      <nav className="flex gap-4">
        <Link
          href="/"
          className="underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Back to home
        </Link>
        <Link
          href="/tracking-check"
          className="underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Tracking check
        </Link>
      </nav>
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
