// HTMLVideoElement.captureStream() is a real, widely-supported browser API
// (Chrome, Firefox, Safari 13+) — just missing from TypeScript's bundled
// DOM lib. HTMLCanvasElement's version is already typed upstream.
interface HTMLVideoElement {
  captureStream?(frameRate?: number): MediaStream;
}

// The Media Capture "Image Capture" point-of-interest extension (tap-to-
// focus) — real, but not part of TypeScript's bundled DOM lib, and support
// varies by browser/device, which is why every call site feature-detects
// via getCapabilities() before ever touching this field.
interface MediaTrackConstraintSet {
  pointsOfInterest?: { x: number; y: number }[];
}
interface MediaTrackCapabilities {
  pointsOfInterest?: boolean;
}
