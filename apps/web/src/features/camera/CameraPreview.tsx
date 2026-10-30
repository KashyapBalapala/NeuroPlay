"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";

type CameraPreviewProps = {
  stream: MediaStream;
  /** Receives the <video> element (null when it is removed), e.g. for tracking. */
  onVideoElement?: (video: HTMLVideoElement | null) => void;
  /** Overlays positioned over the video, such as a landmark canvas. */
  children?: ReactNode;
};

export function CameraPreview({
  stream,
  onVideoElement,
  children,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const setVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      onVideoElement?.(video);
    },
    [onVideoElement],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="relative w-full max-w-xl">
      {/* Mirrored with CSS only so it feels like a mirror; frame data is unchanged.
          Landmark data computed from these frames later is NOT mirrored, so any
          overlay drawn on this preview must flip x (x -> 1 - x) to line up. */}
      <video
        ref={setVideo}
        autoPlay
        muted
        playsInline
        aria-label="Camera preview"
        className="block w-full rounded bg-black"
        style={{ transform: "scaleX(-1)" }}
      />
      {children}
    </div>
  );
}
