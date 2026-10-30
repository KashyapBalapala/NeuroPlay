"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CameraPreview } from "@/features/camera/CameraPreview";
import { CAMERA_MESSAGES } from "@/features/camera/messages";
import { useCamera } from "@/features/camera/useCamera";
import { HandOverlay } from "@/features/tracking/HandOverlay";
import { classifyFrame, STATS_WINDOW_MS } from "@/features/tracking/quality";
import type { FrameQuality } from "@/features/tracking/types";
import { useHandTracking } from "@/features/tracking/useHandTracking";

const TRACKING_MESSAGES: Record<FrameQuality, string> = {
  tracking: "Hand detected",
  "no-hand": "Move your hand into view",
  "low-confidence": "Hand partly visible — try better lighting",
};

// Tracking state can flip every frame; only announce it once it has settled.
const ANNOUNCE_DELAY_MS = 1000;

const BUTTON =
  "rounded border border-current px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const LINK =
  "underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

function useSettledValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

function formatNumber(value: number | undefined, unit: string): string {
  return value === undefined ? "—" : `${value.toFixed(1)} ${unit}`;
}

export default function TrackingCheckPage() {
  const camera = useCamera();
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const tracking = useHandTracking(camera.status === "active" ? video : null);
  const cameraMessage = CAMERA_MESSAGES[camera.status];
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const isFirstRender = useRef(true);

  const hand = tracking.frame?.hands[0];
  const quality = tracking.frame ? classifyFrame(tracking.frame) : null;
  const trackingMessage = useSettledValue(
    quality ? TRACKING_MESSAGES[quality] : "",
    ANNOUNCE_DELAY_MS,
  );

  // The focused camera button disappears when the status changes; move
  // keyboard focus to the button for the new state instead of <body>.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (document.activeElement === document.body) {
      primaryButtonRef.current?.focus();
    }
  }, [camera.status]);

  let modelMessage = "Loading the hand tracking model…";
  if (tracking.status === "model-error") {
    modelMessage = "The hand tracking model could not be loaded.";
  } else if (tracking.status !== "loading-model") {
    modelMessage = `Hand tracking model ready (${tracking.delegate}).`;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <nav className="flex gap-4">
        <Link href="/" className={LINK}>
          Back to home
        </Link>
        <Link href="/camera-check" className={LINK}>
          Camera check
        </Link>
      </nav>
      <h1 className="text-3xl font-semibold">Tracking check</h1>
      <p>
        Check that your hand is tracked. Tracking runs entirely in this
        browser: video and hand positions are never uploaded, recorded or
        saved.
      </p>

      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        <p className="font-medium">{modelMessage}</p>
        {tracking.status === "model-error" && (
          <p>
            Press Try again. If it keeps failing, reload the page or try another
            browser.
          </p>
        )}
        <p className="font-medium">{cameraMessage.title}</p>
        {cameraMessage.help && <p>{cameraMessage.help}</p>}
        {camera.status === "active" && trackingMessage && (
          <p className="font-medium">{trackingMessage}</p>
        )}
      </div>

      {tracking.status === "model-error" && (
        <button type="button" className={BUTTON} onClick={tracking.retry}>
          Try again to load the model
        </button>
      )}

      {camera.status === "idle" && (
        <button
          ref={primaryButtonRef}
          type="button"
          className={BUTTON}
          onClick={() => void camera.start()}
        >
          Start camera
        </button>
      )}

      {cameraMessage.canRetry && (
        <button
          ref={primaryButtonRef}
          type="button"
          className={BUTTON}
          onClick={() => void camera.start()}
        >
          Try again
        </button>
      )}

      {camera.status === "active" && camera.stream && (
        <div className="flex flex-col gap-4">
          <CameraPreview stream={camera.stream} onVideoElement={setVideo}>
            {video && <HandOverlay video={video} frame={tracking.frame} />}
          </CameraPreview>
          <button
            ref={primaryButtonRef}
            type="button"
            className={BUTTON}
            onClick={camera.stop}
          >
            Stop camera
          </button>
        </div>
      )}

      <section aria-labelledby="diagnostics-heading">
        <h2 id="diagnostics-heading" className="text-xl font-semibold">
          Diagnostics
        </h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          <dt>Model delegate</dt>
          <dd>{tracking.delegate ?? "—"}</dd>
          <dt>Detected hand</dt>
          <dd>
            {hand?.hand === "left"
              ? "Left"
              : hand?.hand === "right"
                ? "Right"
                : "—"}
          </dd>
          <dt>Confidence</dt>
          <dd>
            {hand ? `${Math.round(hand.handedness.score * 100)}%` : "—"}
          </dd>
          <dt>Processed frames</dt>
          <dd>{formatNumber(tracking.stats?.fps, "fps")}</dd>
          <dt>Inference time (average)</dt>
          <dd>{formatNumber(tracking.stats?.avgInferenceMs, "ms")}</dd>
          <dt>Inference time (maximum)</dt>
          <dd>{formatNumber(tracking.stats?.maxInferenceMs, "ms")}</dd>
          <dt>Tracking losses (last {STATS_WINDOW_MS / 1000} s)</dt>
          <dd>{tracking.stats?.trackingLosses ?? "—"}</dd>
        </dl>
      </section>
    </main>
  );
}
