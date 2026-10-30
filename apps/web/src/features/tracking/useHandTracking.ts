"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createHandTracker, type HandTracker } from "./handLandmarker";
import { drawHandOverlay } from "./HandOverlay";
import { computeStats, type FrameSample, rollingWindow } from "./quality";
import type { HandFrame, TrackingStats, TrackingStatus } from "./types";

// HTMLMediaElement.HAVE_CURRENT_DATA: a frame is available to read.
const HAVE_CURRENT_DATA = 2;
// React state (status, diagnostics) is published at most 4 times per second;
// the overlay is drawn directly in the loop, so no per-frame re-render is needed.
const PUBLISH_INTERVAL_MS = 250;

type ModelStatus = "loading-model" | "ready" | "model-error";

/** Snapshot published to React, tagged with the video element it came from. */
type LiveState = {
  video: HTMLVideoElement;
  status: "tracking" | "no-hand";
  frame: HandFrame;
  stats: TrackingStats | null;
};

type FrameScheduler = {
  request(callback: () => void): number;
  cancel(handle: number): void;
};

function frameScheduler(video: HTMLVideoElement): FrameScheduler {
  // requestVideoFrameCallback fires once per decoded video frame; fall back to
  // requestAnimationFrame (once per display refresh) where it is unsupported.
  if (typeof video.requestVideoFrameCallback === "function") {
    return {
      request: (callback) => video.requestVideoFrameCallback(callback),
      cancel: (handle) => video.cancelVideoFrameCallback(handle),
    };
  }
  return {
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  };
}

type HandTrackingOptions = {
  numHands?: number;
  /** Canvas to draw landmarks into on every processed frame. */
  overlayRef?: RefObject<HTMLCanvasElement | null>;
};

export function useHandTracking(
  video: HTMLVideoElement | null,
  { numHands = 1, overlayRef }: HandTrackingOptions = {},
) {
  const [tracker, setTracker] = useState<HandTracker | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading-model");
  const [attempt, setAttempt] = useState(0);
  const [live, setLive] = useState<LiveState | null>(null);
  // Every processed frame, without re-rendering; `live.frame` lags behind.
  const latestFrameRef = useRef<HandFrame | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: HandTracker | null = null;
    createHandTracker({ numHands }).then(
      (next) => {
        if (cancelled) {
          next.close();
          return;
        }
        created = next;
        setTracker(next);
        setModelStatus("ready");
      },
      () => {
        if (!cancelled) setModelStatus("model-error");
      },
    );
    return () => {
      cancelled = true;
      created?.close();
      setTracker(null);
    };
  }, [numHands, attempt]);

  useEffect(() => {
    if (!video || !tracker) return;

    const scheduler = frameScheduler(video);
    let handle = 0;
    let stopped = false;
    let busy = false;
    let lastVideoTime = -1;
    let lastTimestamp = -Infinity;
    let lastPublishAt = -Infinity;
    let samples: FrameSample[] = [];
    let drawnCanvas: HTMLCanvasElement | null = null;
    const latestFrame = latestFrameRef;

    const step = () => {
      // A call while a detection is running would start a second loop.
      if (stopped || busy) return;
      const hasNewFrame =
        video.readyState >= HAVE_CURRENT_DATA &&
        video.currentTime !== lastVideoTime;

      if (hasNewFrame) {
        busy = true;
        try {
          lastVideoTime = video.currentTime;
          const startedAt = performance.now();
          // VIDEO mode requires strictly increasing timestamps.
          const timestamp = Math.max(startedAt, lastTimestamp + 1);
          lastTimestamp = timestamp;

          const frame = tracker.detect(video, timestamp);
          latestFrame.current = frame;
          drawnCanvas = overlayRef?.current ?? null;
          if (drawnCanvas) drawHandOverlay(drawnCanvas, video, frame);
          const loopMs = performance.now() - startedAt;

          const handPresent = frame.hands.length > 0;
          samples = rollingWindow(samples, {
            time: startedAt,
            inferenceMs: frame.inferenceMs,
            loopMs,
            handPresent,
          });
          if (startedAt - lastPublishAt >= PUBLISH_INTERVAL_MS) {
            lastPublishAt = startedAt;
            setLive({
              video,
              status: handPresent ? "tracking" : "no-hand",
              frame,
              stats: computeStats(samples),
            });
          }
        } catch {
          stopped = true;
          if (drawnCanvas) drawHandOverlay(drawnCanvas, video, null);
          setModelStatus("model-error");
          return;
        } finally {
          busy = false;
        }
      }
      // Only request the next frame once this detection has finished, so two
      // detections can never run at the same time.
      handle = scheduler.request(step);
    };

    handle = scheduler.request(step);
    return () => {
      stopped = true;
      scheduler.cancel(handle);
      latestFrame.current = null;
      // Do not leave stale landmarks on screen once the loop has stopped.
      if (drawnCanvas) drawHandOverlay(drawnCanvas, video, null);
    };
  }, [video, tracker, overlayRef]);

  const retry = useCallback(() => {
    setModelStatus("loading-model");
    setAttempt((value) => value + 1);
  }, []);

  // Ignore per-frame state left over from a previous video element.
  const current = live?.video === video ? live : null;
  const status: TrackingStatus =
    modelStatus === "ready" && current ? current.status : modelStatus;

  return {
    status,
    delegate: tracker?.delegate ?? null,
    /** Frame from the last published snapshot (at most 4 updates per second). */
    frame: current?.frame ?? null,
    /** Latest processed frame, updated every frame without re-rendering. */
    latestFrameRef,
    stats: current?.stats ?? null,
    retry,
  };
}
