import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerOptions,
} from "@mediapipe/tasks-vision";

import { createHandTracker } from "./handLandmarker";
import { useHandTracking } from "./useHandTracking";

// MediaPipe itself cannot run in jsdom; only its factory functions are mocked.
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  HandLandmarker: { HAND_CONNECTIONS: [], createFromOptions: vi.fn() },
}));
const createFromOptions = vi.mocked(HandLandmarker.createFromOptions);

function fakeLandmarker() {
  return { detectForVideo: vi.fn(), close: vi.fn() } as unknown as HandLandmarker;
}

function requestedDelegates() {
  return createFromOptions.mock.calls.map(
    ([, options]) => (options as HandLandmarkerOptions).baseOptions?.delegate,
  );
}

afterEach(() => {
  createFromOptions.mockReset();
});

describe("createHandTracker", () => {
  test("uses the GPU delegate when it works", async () => {
    createFromOptions.mockResolvedValueOnce(fakeLandmarker());

    const tracker = await createHandTracker();

    expect(tracker.delegate).toBe("GPU");
    expect(requestedDelegates()).toEqual(["GPU"]);
  });

  test("falls back to CPU when GPU creation fails", async () => {
    createFromOptions
      .mockRejectedValueOnce(new Error("WebGL unavailable"))
      .mockResolvedValueOnce(fakeLandmarker());

    const tracker = await createHandTracker();

    expect(tracker.delegate).toBe("CPU");
    expect(requestedDelegates()).toEqual(["GPU", "CPU"]);
  });

  test("loads the WASM runtime and model from this app's own origin", async () => {
    createFromOptions.mockResolvedValueOnce(fakeLandmarker());

    await createHandTracker({ numHands: 2 });

    expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith(
      "/mediapipe/wasm",
    );
    expect(createFromOptions.mock.calls[0][1]).toMatchObject({
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task" },
      runningMode: "VIDEO",
      numHands: 2,
    });
  });

  test("rejects when both GPU and CPU fail", async () => {
    createFromOptions.mockRejectedValue(new Error("no delegate works"));

    await expect(createHandTracker()).rejects.toThrow("no delegate works");
    expect(requestedDelegates()).toEqual(["GPU", "CPU"]);
  });

  test("useHandTracking reports model-error when both delegates fail", async () => {
    createFromOptions.mockRejectedValue(new Error("no delegate works"));

    const { result } = renderHook(() => useHandTracking(null));

    await waitFor(() => expect(result.current.status).toBe("model-error"));
    expect(result.current.delegate).toBeNull();
  });
});
