/**
 * Cuts a car out of a photo entirely in the browser — no server, no API
 * key, no per-image cost. Uses transformers.js (Apache-2.0) running the
 * BEN2 segmentation model (MIT) via ONNX/WASM. The model (tens of MB) is
 * downloaded once on first use and cached by the browser; every cutout
 * after that reuses the already-loaded pipeline.
 *
 * Deliberately NOT @imgly/background-removal, the more famous option in
 * this space — that package's model is AGPL-licensed, which would obligate
 * open-sourcing REVV to ship it in a closed, monetized app.
 */

type Segmenter = (input: string[]) => Promise<{ toBlob: () => Promise<Blob> }[]>;

let segmenterPromise: Promise<Segmenter> | null = null;

export function isBackgroundRemovalSupported(): boolean {
  return typeof WebAssembly !== "undefined";
}

async function loadSegmenter(onProgress?: (fraction: number) => void): Promise<Segmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return pipeline("background-removal", "onnx-community/BEN2-ONNX", {
        progress_callback: (event: { status: string; progress?: number }) => {
          if (event.status === "progress" && typeof event.progress === "number") {
            onProgress?.(event.progress / 100);
          }
        },
      }) as unknown as Promise<Segmenter>;
    })();
  }
  return segmenterPromise;
}

export async function removeBackground(
  imageUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<Blob> {
  const segmenter = await loadSegmenter(onProgress);
  const [output] = await segmenter([imageUrl]);
  return output.toBlob();
}
