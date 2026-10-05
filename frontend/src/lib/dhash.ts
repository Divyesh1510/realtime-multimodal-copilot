/**
 * Lightweight Client-Side Perceptual Difference Hashing (dHash)
 * 
 * Downscales screen video capture to a 320x180 (or 9x8 sample grid) offscreen canvas,
 * computes 64-bit gradient hash, and calculates Hamming distance against the previous frame.
 * 
 * Only frames with significant visual difference are pushed across WebSockets.
 */

export class ScreenFrameHasher {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private prevHash: string | null = null;
  private width: number = 320;
  private height: number = 180;

  constructor() {
    if (typeof window !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    } else {
      this.canvas = null as any;
      this.ctx = null;
    }
  }

  /**
   * Computes a 64-bit difference hash (dHash) from video element.
   * Compares each pixel's brightness with its adjacent right neighbor on a 9x8 grid.
   */
  public computeDHash(videoElement: HTMLVideoElement): { hash: string; hammingDistance: number; isKeyframe: boolean } {
    if (!this.ctx || !videoElement.videoWidth) {
      return { hash: "", hammingDistance: 0, isKeyframe: false };
    }

    // Step 1: Render downscaled frame
    this.ctx.drawImage(videoElement, 0, 0, 9, 8);
    const imageData = this.ctx.getImageData(0, 0, 9, 8);
    const pixels = imageData.data;

    let hash = "";
    // Step 2: Compare pixel brightness across rows (8 rows, 8 comparisons per row = 64 bits)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const leftIdx = (row * 9 + col) * 4;
        const rightIdx = (row * 9 + (col + 1)) * 4;

        // Brightness using standard luminosity coefficients
        const leftLum = 0.299 * pixels[leftIdx] + 0.587 * pixels[leftIdx + 1] + 0.114 * pixels[leftIdx + 2];
        const rightLum = 0.299 * pixels[rightIdx] + 0.587 * pixels[rightIdx + 1] + 0.114 * pixels[rightIdx + 2];

        hash += leftLum > rightLum ? "1" : "0";
      }
    }

    // Step 3: Compute Hamming Distance from previous hash
    let hammingDistance = 64;
    if (this.prevHash) {
      hammingDistance = 0;
      for (let i = 0; i < hash.length; i++) {
        if (hash[i] !== this.prevHash[i]) {
          hammingDistance++;
        }
      }
    }

    // A change > 8-10 indicates substantial code movement, tab switch, or new diagram
    const isKeyframe = !this.prevHash || hammingDistance >= 8;
    this.prevHash = hash;

    return { hash, hammingDistance, isKeyframe };
  }

  /**
   * Extracts a compressed full-resolution WebP snapshot to send when a keyframe is detected.
   */
  public captureFullFrame(videoElement: HTMLVideoElement, quality: number = 0.7): string {
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = videoElement.videoWidth || 1280;
    fullCanvas.height = videoElement.videoHeight || 720;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) return "";

    fullCtx.drawImage(videoElement, 0, 0, fullCanvas.width, fullCanvas.height);
    return fullCanvas.toDataURL("image/webp", quality);
  }
}
