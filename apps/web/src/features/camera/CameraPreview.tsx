"use client";

import { useEffect, useRef } from "react";

type CameraPreviewProps = {
  stream: MediaStream;
};

export function CameraPreview({ stream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    // Mirrored with CSS only so it feels like a mirror; frame data is unchanged.
    // Landmark data computed from these frames later is NOT mirrored, so any
    // overlay drawn on this preview must flip x (x -> 1 - x) to line up.
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      aria-label="Camera preview"
      className="w-full max-w-xl rounded bg-black"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}
