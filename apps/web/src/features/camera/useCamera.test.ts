import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { fakeStream, installMediaDevices } from "./testing";
import { useCamera } from "./useCamera";

let mediaDevices: ReturnType<typeof installMediaDevices>;

beforeEach(() => {
  mediaDevices = installMediaDevices();
});

async function startCamera() {
  const camera = fakeStream("cam-1");
  mediaDevices.getUserMedia.mockResolvedValueOnce(camera.stream);
  const hook = renderHook(() => useCamera());
  await act(() => hook.result.current.start());
  return { hook, ...camera };
}

describe("useCamera", () => {
  test("starts the camera with video-only constraints", async () => {
    const { hook, stream } = await startCamera();

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
        facingMode: "user",
      },
    });
    expect(hook.result.current.status).toBe("active");
    expect(hook.result.current.stream).toBe(stream);
    expect(hook.result.current.settings).toEqual({
      width: 640,
      height: 480,
      frameRate: 30,
      deviceId: "cam-1",
    });
    await waitFor(() => expect(hook.result.current.devices).toHaveLength(2));
  });

  test("reports permission denied", async () => {
    mediaDevices.getUserMedia.mockRejectedValueOnce(
      new DOMException("denied", "NotAllowedError"),
    );
    const { result } = renderHook(() => useCamera());

    await act(() => result.current.start());

    expect(result.current.status).toBe("permission-denied");
    expect(result.current.stream).toBeNull();
    expect(mediaDevices.enumerateDevices).not.toHaveBeenCalled();
  });

  test("stop() stops every track", async () => {
    const { hook, tracks } = await startCamera();

    act(() => hook.result.current.stop());

    for (const track of tracks) expect(track.stop).toHaveBeenCalled();
    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.stream).toBeNull();
  });

  test("unmounting stops every track", async () => {
    const { hook, tracks } = await startCamera();

    hook.unmount();

    for (const track of tracks) expect(track.stop).toHaveBeenCalled();
  });

  test("switching device stops the old stream", async () => {
    const { hook, tracks: oldTracks } = await startCamera();
    const next = fakeStream("cam-2");
    mediaDevices.getUserMedia.mockResolvedValueOnce(next.stream);

    await act(() => hook.result.current.switchDevice("cam-2"));

    for (const track of oldTracks) expect(track.stop).toHaveBeenCalled();
    expect(mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
      audio: false,
      video: expect.objectContaining({ deviceId: { exact: "cam-2" } }),
    });
    expect(hook.result.current.stream).toBe(next.stream);
    expect(hook.result.current.settings?.deviceId).toBe("cam-2");
    for (const track of next.tracks) expect(track.stop).not.toHaveBeenCalled();
  });

  test("an unexpected track end moves to the disconnected state", async () => {
    const { hook, tracks } = await startCamera();

    act(() => {
      tracks[0].dispatchEvent(new Event("ended"));
    });

    expect(hook.result.current.status).toBe("disconnected");
    expect(hook.result.current.stream).toBeNull();
    for (const track of tracks) expect(track.stop).toHaveBeenCalled();
  });

  test("stops a stream that arrives after stop() was pressed", async () => {
    const late = fakeStream("cam-1");
    let resolve: (stream: MediaStream) => void = () => {};
    mediaDevices.getUserMedia.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useCamera());

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.start();
    });
    act(() => result.current.stop());
    await act(async () => {
      resolve(late.stream);
      await pending;
    });

    for (const track of late.tracks) expect(track.stop).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(result.current.stream).toBeNull();
  });
});
