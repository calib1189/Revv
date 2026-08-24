// HTMLVideoElement.captureStream() is a real, widely-supported browser API
// (Chrome, Firefox, Safari 13+) — just missing from TypeScript's bundled
// DOM lib. HTMLCanvasElement's version is already typed upstream.
interface HTMLVideoElement {
  captureStream?(frameRate?: number): MediaStream;
}
