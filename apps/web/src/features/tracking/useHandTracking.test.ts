import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createHandTracker, type HandTracker } from "./handLandmarker";
import type { HandFrame } from "./types";
import { useHandTracking } from "./useHandTracking";

// Real MediaPipe inference cannot run in jsdom; the landmarker is mocked.
vi.mock("./handLandmarker", () => ({
  createHandTracker: vi.fn(),
  HAND_CONNECTIONS: [{ start: 0, end: 1 }],
}));
const createTracker = vi.mocked(createHandTracker);

// jsdom has no requestVideoFrameCallback, so the hook uses requestAnimationFrame,
// which these tests drive by hand.
let frames = new Map<number, FrameRequestCallback>();
let nextFrameId = 0;

function tick() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(performance.now())));
}

function fakeVideo() {
  const video = document.createElement("video");
  const state = { readyState: 0, currentTime: 0 };
  Object.defineProperty(video, "readyState", { get: () => state.readyState });
  Object.defineProperty(video, "currentTime", { get: () => state.currentTime });
  return {
    video,
    /** Marks the video as playing and advances it to the next frame. */
    nextFrame() {
      state.readyState = 4;
      state.currentTime += 1 / 30;
    },
  };
}

function fakeTracker() {
  return {
    delegate: "CPU" as const,
    detect: vi.fn<HandTracker["detect"]>(
      (_video, timestamp): HandFrame => ({ timestamp, inferenceMs: 2, hands: [] }),
    ),
    close: vi.fn(),
  };
}

beforeEach(() => {
  frames = new Map();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrameId, callback);
    return nextFrameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  createTracker.mockReset();
});

async function renderReady() {
  const tracker = fakeTracker();
  createTracker.mockResolvedValueOnce(tracker);
  const camera = fakeVideo();
  const hook = renderHook(() => useHandTracking(camera.video));
  await waitFor(() => expect(hook.result.current.status).toBe("ready"));
  return { tracker, camera, hook };
}

describe("useHandTracking", () => {
  test("starts detecting only once the video has a frame", async () => {
    const { tracker, camera, hook } = await renderReady();

    tick();
    tick();
    expect(tracker.detect).not.toHaveBeenCalled();

    camera.nextFrame();
    tick();
    expect(tracker.detect).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status).toBe("no-hand");
    expect(hook.result.current.delegate).toBe("CPU");
  });

  test("skips unchanged video frames and keeps timestamps increasing", async () => {
    const { tracker, camera } = await renderReady();

    camera.nextFrame();
    tick();
    tick(); // same video time: skipped
    camera.nextFrame();
    tick();

    expect(tracker.detect).toHaveBeenCalledTimes(2);
    const [first, second] = tracker.detect.mock.calls.map(([, ts]) => ts);
    expect(second).toBeGreaterThan(first);
  });

  test("never runs overlapping detections", async () => {
    const { tracker, camera } = await renderReady();
    let running = 0;
    let maxRunning = 0;
    let reentered: FrameRequestCallback | undefined;

    tracker.detect.mockImplementation((_video, timestamp) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      // The next frame must not be requested while a detection is running...
      expect(frames.size).toBe(0);
      // ...and a re-entrant frame callback must not start another detection.
      camera.nextFrame();
      reentered?.(performance.now());
      running--;
      return { timestamp, inferenceMs: 2, hands: [] };
    });

    for (let i = 0; i < 5; i++) {
      camera.nextFrame();
      reentered = [...frames.values()][0];
      tick();
    }

    expect(maxRunning).toBe(1);
    expect(tracker.detect).toHaveBeenCalledTimes(5);
    expect(frames.size).toBe(1);
  });

  test("stops the loop and closes the landmarker on unmount", async () => {
    const { tracker, camera, hook } = await renderReady();
    camera.nextFrame();
    tick();

    hook.unmount();

    expect(tracker.close).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    camera.nextFrame();
    tick();
    expect(tracker.detect).toHaveBeenCalledTimes(1);
  });

  test("closes a landmarker that finishes loading after unmount", async () => {
    const tracker = fakeTracker();
    let resolve: (value: HandTracker) => void = () => {};
    createTracker.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const hook = renderHook(() => useHandTracking(fakeVideo().video));

    hook.unmount();
    await act(async () => resolve(tracker));

    expect(tracker.close).toHaveBeenCalledTimes(1);
  });

  test("moves to model-error when creation fails, and retry recovers", async () => {
    createTracker.mockRejectedValueOnce(new Error("GPU and CPU failed"));
    const { result } = renderHook(() => useHandTracking(fakeVideo().video));

    await waitFor(() => expect(result.current.status).toBe("model-error"));
    expect(frames.size).toBe(0);

    createTracker.mockResolvedValueOnce(fakeTracker());
    act(() => result.current.retry());
    expect(result.current.status).toBe("loading-model");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(createTracker).toHaveBeenCalledTimes(2);
  });

  test("draws every frame but re-renders at most 4 times per second", async () => {
    const tracker = fakeTracker();
    tracker.detect.mockImplementation((_video, timestamp) => ({
      timestamp,
      inferenceMs: 2,
      hands: [
        {
          landmarks: [
            { x: 0.4, y: 0.4, z: 0 },
            { x: 0.6, y: 0.6, z: 0 },
          ],
          worldLandmarks: [],
          handedness: { label: "Right", score: 0.9 },
          hand: "right",
        },
      ],
    }));
    createTracker.mockResolvedValueOnce(tracker);

    const context = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    const overlayRef = { current: canvas };

    const camera = fakeVideo();
    let renders = 0;
    const hook = renderHook(() => {
      renders++;
      return useHandTracking(camera.video, { overlayRef });
    });
    await waitFor(() => expect(hook.result.current.status).toBe("ready"));

    // 120 frames at 30 fps = 4 seconds of video.
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const rendersBefore = renders;
    for (let i = 0; i < 120; i++) {
      now += 1000 / 30;
      camera.nextFrame();
      tick();
    }

    expect(tracker.detect).toHaveBeenCalledTimes(120);
    expect(context.clearRect).toHaveBeenCalledTimes(120);
    expect(context.arc).toHaveBeenCalledTimes(240);
    // One snapshot per 250 ms over 4 s, plus the first frame.
    expect(renders - rendersBefore).toBeLessThanOrEqual(17);
    expect(hook.result.current.latestFrameRef.current?.timestamp).toBe(now);
    expect(hook.result.current.status).toBe("tracking");

    // Stopping clears the overlay so no stale landmarks stay on screen.
    hook.unmount();
    expect(context.clearRect).toHaveBeenCalledTimes(121);
  });

  test("moves to model-error when detection throws", async () => {
    const { tracker, camera, hook } = await renderReady();
    tracker.detect.mockImplementationOnce(() => {
      throw new Error("detect failed");
    });

    camera.nextFrame();
    tick();

    expect(hook.result.current.status).toBe("model-error");
    expect(frames.size).toBe(0);
  });
});
