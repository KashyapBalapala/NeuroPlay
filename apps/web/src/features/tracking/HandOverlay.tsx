"use client";

import { useEffect, useRef } from "react";

import { HAND_CONNECTIONS } from "./handLandmarker";
import { toCanvasPoint } from "./overlay";
import type { HandFrame } from "./types";

type HandOverlayProps = {
  video: HTMLVideoElement;
  frame: HandFrame | null;
};

/** Draws landmarks over the (CSS-mirrored) camera preview. */
export function HandOverlay({ video, frame }: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // Match the video's actual resolution; CSS stretches both to the same box.
    const { videoWidth: width, videoHeight: height } = video;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.clearRect(0, 0, width, height);
    if (!frame) return;

    const radius = Math.max(2, width / 160);
    context.lineWidth = Math.max(1, width / 320);
    context.strokeStyle = "rgb(34 197 94)";
    context.fillStyle = "rgb(239 68 68)";

    for (const hand of frame.hands) {
      const points = hand.landmarks.map((landmark) =>
        toCanvasPoint(landmark, width, height, true),
      );
      context.beginPath();
      for (const { start, end } of HAND_CONNECTIONS) {
        context.moveTo(points[start].x, points[start].y);
        context.lineTo(points[end].x, points[end].y);
      }
      context.stroke();
      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        context.fill();
      }
    }
  }, [video, frame]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
