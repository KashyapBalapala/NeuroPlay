/**
 * Maps a normalized landmark (0..1, unmirrored frame) to canvas pixels.
 *
 * The camera preview is mirrored with CSS while the frames sent to MediaPipe
 * are not, so with `mirrored` the x axis is flipped to line up with the
 * preview.
 */
export function toCanvasPoint(
  landmark: { x: number; y: number },
  width: number,
  height: number,
  mirrored: boolean,
): { x: number; y: number } {
  return {
    x: (mirrored ? 1 - landmark.x : landmark.x) * width,
    y: landmark.y * height,
  };
}
