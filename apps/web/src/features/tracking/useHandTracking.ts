"use client";

import { useCallback, useEffect, useState } from "react";

import { createHandTracker, type HandTracker } from "./handLandmarker";
import { computeStats, type FrameSample, rollingWindow } from "./quality";
import type { HandFrame, TrackingStats, TrackingStatus } from "./types";

// HTMLMediaElement.HAVE_CURRENT_DATA: a frame is available to read.
const HAVE_CURRENT_DATA = 2;
// Stats change quickly; refreshing them every frame would only cost renders.
const STATS_INTERVAL_MS = 500;

type ModelStatus = "loading-model" | "ready" | "model-error";

/** Per-frame state, tagged with the video element it was produced from. */
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

export function useHandTracking(
  video: HTMLVideoElement | null,
  { numHands = 1 }: { numHands?: number } = {},
) {
  const [tracker, setTracker] = useState<HandTracker | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading-model");
  const [attempt, setAttempt] = useState(0);
  const [live, setLive] = useState<LiveState | null>(null);

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
    let lastStatsAt = -Infinity;
    let samples: FrameSample[] = [];

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
          const now = performance.now();
          // VIDEO mode requires strictly increasing timestamps.
          const timestamp = Math.max(now, lastTimestamp + 1);
          lastTimestamp = timestamp;

          const frame = tracker.detect(video, timestamp);
          const handPresent = frame.hands.length > 0;
          samples = rollingWindow(samples, {
            time: now,
            inferenceMs: frame.inferenceMs,
            handPresent,
          });
          const refreshStats = now - lastStatsAt >= STATS_INTERVAL_MS;
          if (refreshStats) lastStatsAt = now;

          setLive((previous) => ({
            video,
            status: handPresent ? "tracking" : "no-hand",
            frame,
            stats: refreshStats
              ? computeStats(samples)
              : previous?.video === video
                ? previous.stats
                : null,
          }));
        } catch {
          stopped = true;
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
    };
  }, [video, tracker]);

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
    frame: current?.frame ?? null,
    stats: current?.stats ?? null,
    retry,
  };
}
