import { vi } from "vitest";

/** Minimal stand-in for a MediaStreamTrack in jsdom, which has no camera APIs. */
export class FakeTrack extends EventTarget {
  readonly kind = "video";
  readyState: MediaStreamTrackState = "live";
  stop = vi.fn(() => {
    this.readyState = "ended";
  });

  constructor(private readonly deviceId: string) {
    super();
  }

  getSettings(): MediaTrackSettings {
    return { width: 640, height: 480, frameRate: 30, deviceId: this.deviceId };
  }
}

export function fakeStream(deviceId = "cam-1") {
  const tracks = [new FakeTrack(deviceId)];
  const stream = {
    getTracks: () => tracks,
    getVideoTracks: () => tracks,
  } as unknown as MediaStream;
  return { stream, tracks };
}

export function fakeDevice(deviceId: string, label: string): MediaDeviceInfo {
  return { deviceId, label, kind: "videoinput", groupId: "" } as MediaDeviceInfo;
}

/** Installs a mocked navigator.mediaDevices and a secure context. */
export function installMediaDevices() {
  const mediaDevices = Object.assign(new EventTarget(), {
    getUserMedia: vi.fn<MediaDevices["getUserMedia"]>(),
    enumerateDevices: vi.fn<MediaDevices["enumerateDevices"]>(async () => [
      fakeDevice("cam-1", "Front camera"),
      fakeDevice("cam-2", "USB camera"),
    ]),
  });
  Object.defineProperty(navigator, "mediaDevices", {
    value: mediaDevices,
    configurable: true,
  });
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  return mediaDevices;
}
