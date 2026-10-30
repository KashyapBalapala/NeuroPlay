"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cameraStatusFromError, checkCameraSupport } from "./errors";
import type { CameraSettings, CameraStatus } from "./types";

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 30 },
};

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [settings, setSettings] = useState<CameraSettings | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  // Bumped by every start, stop and unmount, so a getUserMedia call that
  // resolves after the user moved on is discarded and its tracks stopped.
  const requestRef = useRef(0);
  // Device labels are only available after permission has been granted.
  const permissionGrantedRef = useRef(false);

  const releaseStream = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setSettings(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((device) => device.kind === "videoinput"));
    } catch {
      // Keep the previous list; switching devices is optional.
    }
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      const request = ++requestRef.current;
      // Stop the old stream first: many cameras cannot be opened twice.
      releaseStream();

      const blocked = checkCameraSupport({
        isSecureContext: window.isSecureContext,
        mediaDevices: navigator.mediaDevices,
      });
      if (blocked) {
        setStatus(blocked);
        return;
      }

      setStatus("requesting");
      let next: MediaStream;
      try {
        next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId
            ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } }
            : { ...VIDEO_CONSTRAINTS, facingMode: "user" },
        });
      } catch (error) {
        if (request === requestRef.current) {
          setStatus(cameraStatusFromError(error));
        }
        return;
      }

      if (request !== requestRef.current) {
        stopStream(next);
        return;
      }

      const track = next.getVideoTracks()[0];
      // "ended" only fires when the browser ends the track (device unplugged,
      // permission revoked), never for our own track.stop() calls.
      track.addEventListener(
        "ended",
        () => {
          if (streamRef.current !== next) return;
          releaseStream();
          setStatus("disconnected");
        },
        { once: true },
      );

      streamRef.current = next;
      permissionGrantedRef.current = true;
      const actual = track.getSettings();
      setStream(next);
      setSettings({
        width: actual.width,
        height: actual.height,
        frameRate: actual.frameRate,
        deviceId: actual.deviceId,
      });
      setStatus("active");
      await refreshDevices();
    },
    [releaseStream, refreshDevices],
  );

  const stop = useCallback(() => {
    requestRef.current++;
    releaseStream();
    setStatus("idle");
  }, [releaseStream]);

  const switchDevice = useCallback(
    (deviceId: string) => start(deviceId),
    [start],
  );

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
    const onDeviceChange = () => {
      if (permissionGrantedRef.current) void refreshDevices();
    };
    mediaDevices?.addEventListener("devicechange", onDeviceChange);
    window.addEventListener("pagehide", stop);
    return () => {
      mediaDevices?.removeEventListener("devicechange", onDeviceChange);
      window.removeEventListener("pagehide", stop);
    };
  }, [refreshDevices, stop]);

  useEffect(() => {
    const requests = requestRef;
    const current = streamRef;
    return () => {
      requests.current++;
      stopStream(current.current);
      current.current = null;
    };
  }, []);

  return { status, stream, settings, devices, start, stop, switchDevice };
}
