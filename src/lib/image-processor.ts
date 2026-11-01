export interface ProcessImageOptions {
  file: File;
  targetWidth: number;
  targetHeight: number;
  minKb: number;
  maxKb: number;
  mode: 'photo' | 'signature';
  addDop?: boolean;
  candidateName?: string;
  photoDate?: string;
  cleanSignatureBackground?: boolean;
  rotation?: number; // 0, 90, 180, 270
  zoom?: number; // 1.0 to 2.5
  panX?: number; // horizontal offset in px
  panY?: number; // vertical offset in px
}

export interface ProcessImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  sizeKb: number;
  isValid: boolean;
  format: string;
}

/**
 * Loads a File into an HTMLImageElement asynchronously
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image file. Please try a standard JPG/PNG image.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file from your device.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Clean signature using block-based adaptive thresholding.
 * Eliminates smartphone shadows, yellow/grey paper tint, and boosts faint blue/black ink
 * to crisp high-contrast black on 100% pure white paper.
 */
function applySignatureAdaptiveThreshold(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Block size for background estimation (around 1/8th of smallest dimension)
  const blockSize = Math.max(16, Math.min(64, Math.round(Math.min(width, height) / 6)));
  const blocksX = Math.ceil(width / blockSize);
  const blocksY = Math.ceil(height / blockSize);

  // 1. Calculate average luminance per block to map the local paper brightness
  const blockAvg = new Float32Array(blocksX * blocksY);
  const blockCount = new Int32Array(blocksX * blocksY);

  for (let y = 0; y < height; y++) {
    const by = Math.floor(y / blockSize);
    for (let x = 0; x < width; x++) {
      const bx = Math.floor(x / blockSize);
      const bIdx = by * blocksX + bx;
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      blockAvg[bIdx] += lum;
      blockCount[bIdx]++;
    }
  }

  for (let b = 0; b < blockAvg.length; b++) {
    if (blockCount[b] > 0) {
      blockAvg[b] /= blockCount[b];
    } else {
      blockAvg[b] = 240;
    }
  }

  // 2. Classify each pixel against its local background
  for (let y = 0; y < height; y++) {
    const by = Math.min(blocksY - 1, Math.floor(y / blockSize));
    for (let x = 0; x < width; x++) {
      const bx = Math.min(blocksX - 1, Math.floor(x / blockSize));
      const localBg = blockAvg[by * blocksX + bx];
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // If significantly darker than the local paper background
      if (lum < localBg - 15 && lum < 210) {
        // High-contrast ink: dark crisp lines
        const factor = Math.max(0, Math.min(1, lum / Math.max(1, localBg - 15)));
        data[i] = Math.round(factor * 25);
        data[i + 1] = Math.round(factor * 25);
        data[i + 2] = Math.round(factor * 30);
      } else {
        // Pure white background
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Draws Name & Date of Photo (DOP) on an official solid white footer banner.
 */
function drawDopFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  footerHeight: number,
  name?: string,
  dop?: string
) {
  if (!name && !dop) return;

  const footerY = height - footerHeight;

  // 1. Draw solid white background strip
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, footerY, width, footerHeight);

  // 2. Draw crisp separating border line above banner
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = Math.max(1, Math.round(width / 350));
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  // 3. Draw text in clean bold sans-serif
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = Math.max(11, Math.round(footerHeight * 0.32));
  ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;

  if (name && dop) {
    const lineSpacing = footerHeight * 0.26;
    ctx.fillText(name.toUpperCase().trim(), width / 2, footerY + lineSpacing);
    ctx.font = `600 ${Math.round(fontSize * 0.88)}px Inter, Arial, sans-serif`;
    ctx.fillText(`DOP: ${dop.trim()}`, width / 2, footerY + lineSpacing + fontSize + 4);
  } else if (name) {
    ctx.fillText(name.toUpperCase().trim(), width / 2, footerY + footerHeight / 2);
  } else if (dop) {
    ctx.fillText(`DOP: ${dop.trim()}`, width / 2, footerY + footerHeight / 2);
  }
}

/**
 * Appends standard, 100% compliant JPEG COM (Comment) segments to reach target minimum size.
 * Solves portal rejections for small signatures (e.g. Banking portal rejecting 4KB signatures).
 */
function padJpegToTargetBytes(bytes: Uint8Array, targetBytes: number): Uint8Array {
  if (bytes.length >= targetBytes || bytes.length < 4) return bytes;
  // Verify standard JPEG SOI marker (0xFF, 0xD8)
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return bytes;

  let remaining = targetBytes - bytes.length;
  const segments: Uint8Array[] = [bytes.subarray(0, 2)];

  while (remaining >= 4) {
    const chunkLen = Math.min(remaining - 4, 65533);
    const segLen = chunkLen + 2;
    const header = new Uint8Array([0xFF, 0xFE, (segLen >> 8) & 0xFF, segLen & 0xFF]);
    const payload = new Uint8Array(chunkLen);
    payload.fill(0x20); // standard space padding
    segments.push(header, payload);
    remaining -= (4 + chunkLen);
  }

  segments.push(bytes.subarray(2));

  // Assemble concatenated Uint8Array
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const seg of segments) {
    result.set(seg, offset);
    offset += seg.length;
  }
  return result;
}

/**
 * Main Image Processing & Target KB Binary Search Compressor
 */
export async function processImage(options: ProcessImageOptions): Promise<ProcessImageResult> {
  const {
    file,
    targetWidth,
    targetHeight,
    minKb,
    maxKb,
    mode,
    addDop,
    candidateName,
    photoDate,
    cleanSignatureBackground,
    rotation = 0,
    zoom = 1.0,
    panX = 0,
    panY = 0
  } = options;

  const img = await loadImageFromFile(file);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not initialize canvas context.');

  // Fill canvas with pure white background (prevents black background bug from transparent PNGs)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // If DOP is requested in photo mode, reserve 18% at the bottom so the photo itself is not occluded
  const footerHeight = (mode === 'photo' && addDop) ? Math.round(targetHeight * 0.18) : 0;
  const visiblePhotoHeight = targetHeight - footerHeight;

  // Compute orientation & dimensions
  const isSideways = rotation === 90 || rotation === 270;
  const effectiveWidth = isSideways ? img.naturalHeight : img.naturalWidth;
  const effectiveHeight = isSideways ? img.naturalWidth : img.naturalHeight;

  // Scale with cover crop + optional user zoom
  const baseScale = Math.max(targetWidth / effectiveWidth, visiblePhotoHeight / effectiveHeight);
  const currentZoom = Math.max(0.5, Math.min(3.0, zoom));
  const finalScale = baseScale * currentZoom;

  const scaledDrawWidth = img.naturalWidth * finalScale;
  const scaledDrawHeight = img.naturalHeight * finalScale;

  // Center within the visible photo region + optional user pan
  const centerX = targetWidth / 2 + panX;
  const centerY = visiblePhotoHeight / 2 + panY;

  ctx.save();
  // Clip to visible photo area to ensure nothing bleeds into the DOP footer
  ctx.beginPath();
  ctx.rect(0, 0, targetWidth, visiblePhotoHeight);
  ctx.clip();

  ctx.translate(centerX, centerY);
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  ctx.drawImage(img, -scaledDrawWidth / 2, -scaledDrawHeight / 2, scaledDrawWidth, scaledDrawHeight);
  ctx.restore();

  // Apply signature enhancement if in signature mode
  if (mode === 'signature' && cleanSignatureBackground) {
    applySignatureAdaptiveThreshold(ctx, targetWidth, targetHeight);
  }

  // Draw Name & Date of Photo (DOP) banner if enabled
  if (mode === 'photo' && addDop) {
    drawDopFooter(ctx, targetWidth, targetHeight, footerHeight, candidateName, photoDate);
  }

  // Target KB Binary Search Compression
  const minBytes = minKb * 1024;
  const maxBytes = maxKb * 1024;
  const idealTargetBytes = ((minKb + maxKb * 2) / 3) * 1024;

  let lowQuality = 0.05;
  let highQuality = 0.98;
  let bestBlob: Blob | null = null;

  const getBlob = (quality: number): Promise<Blob> => {
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob([], { type: 'image/jpeg' })), 'image/jpeg', quality);
    });
  };

  // Perform binary search iterations
  for (let i = 0; i < 8; i++) {
    const midQuality = (lowQuality + highQuality) / 2;
    const blob = await getBlob(midQuality);

    if (blob.size >= minBytes && blob.size <= maxBytes) {
      bestBlob = blob;
      // Close to ideal target? Break early
      if (Math.abs(blob.size - idealTargetBytes) < 2048) break;
      if (blob.size < idealTargetBytes) {
        lowQuality = midQuality;
      } else {
        highQuality = midQuality;
      }
    } else if (blob.size > maxBytes) {
      highQuality = midQuality;
    } else {
      lowQuality = midQuality;
    }
  }

  // Fallback if not inside target window
  if (!bestBlob) {
    bestBlob = await getBlob(lowQuality);
    if (bestBlob.size > maxBytes) {
      bestBlob = await getBlob(0.05);
    }
  }

  // If bestBlob is still below minBytes (common for signatures or small icons),
  // pad it with valid standard JPEG COM metadata to land comfortably within [minKb, maxKb]!
  if (bestBlob.size < minBytes) {
    const arrayBuffer = await bestBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const targetPaddedBytes = Math.round(idealTargetBytes);
    const padded = padJpegToTargetBytes(bytes, targetPaddedBytes);
    bestBlob = new Blob([padded], { type: 'image/jpeg' });
  }

  const finalSizeKb = Math.round((bestBlob.size / 1024) * 10) / 10;
  const isValid = bestBlob.size >= minBytes && bestBlob.size <= maxBytes;
  const dataUrl = URL.createObjectURL(bestBlob);

  return {
    blob: bestBlob,
    dataUrl,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: bestBlob.size,
    sizeKb: finalSizeKb,
    isValid,
    format: 'image/jpeg'
  };
}
