
/**
 * Image Processing Utilities for StegnoSafe Forensics
 */
import { encodeMessage, decodeMessage, calculateCapacity } from './stegoEngine';

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
}

export interface ForensicStats {
  entropy: number;
  lsbVariance: number;
  noiseComplexity: number;
  integrityScore: number;
  bitDistribution: { r: number, g: number, b: number };
}

export const getImageCapacity = calculateCapacity;

/**
 * Calculates comprehensive forensic statistics for an image
 */
export const calculateForensicStats = (canvas: HTMLCanvasElement): ForensicStats => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { entropy: 0, lsbVariance: 0, noiseComplexity: 0, integrityScore: 100, bitDistribution: { r: 0, g: 0, b: 0 } };
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const counts = new Array(256).fill(0);
  let lsbOn = { r: 0, g: 0, b: 0 };
  let totalPixels = imageData.length / 4;

  for (let i = 0; i < imageData.length; i += 4) {
    const avg = Math.floor((imageData[i] + imageData[i+1] + imageData[i+2]) / 3);
    counts[avg]++;
    if (imageData[i] & 1) lsbOn.r++;
    if (imageData[i+1] & 1) lsbOn.g++;
    if (imageData[i+2] & 1) lsbOn.b++;
  }

  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (counts[i] > 0) {
      const p = counts[i] / totalPixels;
      entropy -= p * Math.log2(p);
    }
  }

  // Calculate LSB variance (ideally should be near 0.5 for random noise)
  const rDist = lsbOn.r / totalPixels;
  const gDist = lsbOn.g / totalPixels;
  const bDist = lsbOn.b / totalPixels;
  const lsbVar = (Math.abs(0.5 - rDist) + Math.abs(0.5 - gDist) + Math.abs(0.5 - bDist)) / 3;

  return {
    entropy: parseFloat(entropy.toFixed(3)),
    lsbVariance: parseFloat(lsbVar.toFixed(4)),
    noiseComplexity: parseFloat(((entropy / 8) * 100).toFixed(1)),
    integrityScore: Math.max(0, 100 - Math.floor(lsbVar * 200)),
    bitDistribution: { r: rDist, g: gDist, b: bDist }
  };
};

/**
 * Converts a bit-plane into an AudioBuffer for "listening" to the image noise.
 */
export const sonifyBitPlane = async (
  canvas: HTMLCanvasElement, 
  channel: 'R' | 'G' | 'B', 
  plane: number
): Promise<AudioBuffer> => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = 44100;
  const duration = 2.0;
  const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
  const channelData = buffer.getChannelData(0);

  const ctx = canvas.getContext('2d');
  if (!ctx) return buffer;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const bit = 1 << plane;
  const cOff = channel === 'R' ? 0 : channel === 'G' ? 1 : 2;

  for (let i = 0; i < channelData.length; i++) {
    const pixelIdx = (i % (imageData.length / 4)) * 4;
    const isSet = (imageData[pixelIdx + cOff] & bit) !== 0;
    channelData[i] = isSet ? 0.2 : -0.2;
  }

  return buffer;
};

export const encodeLSB = (canvas: HTMLCanvasElement, message: string): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const payload = new TextEncoder().encode(message);
  const encodedData = encodeMessage(imageData, payload);
  ctx.putImageData(encodedData, 0, 0);
  return canvas.toDataURL();
};

export const decodeLSB = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  try {
    const bytes = decodeMessage(imageData);
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
};

export const appendEOFData = (buffer: ArrayBuffer, message: string): Blob => {
  const payload = new TextEncoder().encode(message);
  const combined = new Uint8Array(buffer.byteLength + payload.byteLength);
  combined.set(new Uint8Array(buffer), 0);
  combined.set(payload, buffer.byteLength);
  return new Blob([combined]);
};

export const detectTrailingData = (buffer: ArrayBuffer, mimeType: string): { data: string } | null => {
  const data = new Uint8Array(buffer);
  let eofOffset = -1;
  if (mimeType === 'image/png') {
    const iend = [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];
    for (let i = data.length - 12; i >= 0; i--) {
      let match = true;
      for (let j = 0; j < iend.length; j++) {
        if (data[i + 4 + j] !== iend[j]) { match = false; break; }
      }
      if (match) { eofOffset = i + 12; break; }
    }
  } else if (mimeType === 'image/jpeg') {
    for (let i = data.length - 2; i >= 0; i--) {
      if (data[i] === 0xFF && data[i + 1] === 0xD9) { eofOffset = i + 2; break; }
    }
  }
  if (eofOffset !== -1 && eofOffset < data.length) {
    const trailing = data.slice(eofOffset);
    return { data: new TextDecoder().decode(trailing) };
  }
  return null;
};

export const stripEOFData = (buffer: ArrayBuffer, mimeType: string): Blob => {
  const data = new Uint8Array(buffer);
  let eofOffset = data.length;
  if (mimeType === 'image/png') {
    const iend = [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];
    for (let i = data.length - 12; i >= 0; i--) {
      let match = true;
      for (let j = 0; j < iend.length; j++) {
        if (data[i + 4 + j] !== iend[j]) { match = false; break; }
      }
      if (match) { eofOffset = i + 12; break; }
    }
  } else if (mimeType === 'image/jpeg') {
    for (let i = data.length - 2; i >= 0; i--) {
      if (data[i] === 0xFF && data[i + 1] === 0xD9) { eofOffset = i + 2; break; }
    }
  }
  return new Blob([data.slice(0, eofOffset)], { type: mimeType });
};

export const calculateEntropyMap = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const output = ctx.createImageData(width, height);
  const outData = output.data;
  const windowSize = 4;
  for (let y = windowSize; y < height - windowSize; y++) {
    for (let x = windowSize; x < width - windowSize; x++) {
      const idx = (y * width + x) * 4;
      const counts = new Array(256).fill(0);
      let total = 0;
      for (let wy = -windowSize; wy <= windowSize; wy++) {
        for (let wx = -windowSize; wx <= windowSize; wx++) {
          const pIdx = ((y + wy) * width + (x + wx)) * 4;
          const brightness = Math.floor((data[pIdx] + data[pIdx+1] + data[pIdx+2]) / 3);
          counts[brightness]++;
          total++;
        }
      }
      let entropy = 0;
      for (let i = 0; i < 256; i++) {
        if (counts[i] > 0) {
          const p = counts[i] / total;
          entropy -= p * Math.log2(p);
        }
      }
      const val = Math.min((entropy / 5) * 255, 255);
      outData[idx] = 0; outData[idx + 1] = val; outData[idx + 2] = val / 2; outData[idx + 3] = 255;
    }
  }
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width; tempCanvas.height = height;
  tempCanvas.getContext('2d')?.putImageData(output, 0, 0);
  return tempCanvas.toDataURL();
};

export const getMetadataInfo = (file: File): Promise<Record<string, any>> => {
  return new Promise((resolve) => {
    const info: Record<string, any> = {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString(),
    };
    resolve(info);
  });
};

export const getBitPlane = (
  canvas: HTMLCanvasElement,
  channel: 'R' | 'G' | 'B' | 'Y' | 'Cb' | 'Cr',
  plane: number
): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const output = ctx.createImageData(canvas.width, canvas.height);
  const outData = output.data;
  const bit = 1 << plane;
  for (let i = 0; i < data.length; i += 4) {
    let val = 0;
    if (channel === 'R') val = data[i];
    else if (channel === 'G') val = data[i+1];
    else if (channel === 'B') val = data[i+2];
    else { val = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]; }
    const color = (Math.round(val) & bit) ? 255 : 0;
    outData[i] = color; outData[i + 1] = color; outData[i + 2] = color; outData[i + 3] = 255;
  }
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
  tempCanvas.getContext('2d')?.putImageData(output, 0, 0);
  return tempCanvas.toDataURL();
};

export const getNoiseFilter = (canvas: HTMLCanvasElement, type: 'gradient' | 'sobel' | 'variance' | 'entropy' = 'gradient'): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const output = ctx.createImageData(width, height);
  const outData = output.data;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const nextIdx = (y * width + (x + 1)) * 4;
      for (let c = 0; c < 3; c++) {
        const diff = Math.abs(data[idx + c] - data[nextIdx + c]);
        outData[idx + c] = Math.min(diff * 12, 255);
      }
      outData[idx + 3] = 255;
    }
  }
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width; tempCanvas.height = height;
  tempCanvas.getContext('2d')?.putImageData(output, 0, 0);
  return tempCanvas.toDataURL();
};

export const getHistogramData = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  const r = new Array(256).fill(0), g = new Array(256).fill(0), b = new Array(256).fill(0);
  if (!ctx) return { r, g, b };
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++; g[data[i+1]]++; b[data[i+2]]++;
  }
  return { r, g, b };
};

export const getPixelDiff = (original: HTMLCanvasElement, stego: HTMLCanvasElement): string => {
  const width = original.width;
  const height = original.height;
  const oCtx = original.getContext('2d');
  const sCtx = stego.getContext('2d');
  if (!oCtx || !sCtx) return '';
  const oData = oCtx.getImageData(0, 0, width, height).data;
  const sData = sCtx.getImageData(0, 0, width, height).data;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const dCtx = diffCanvas.getContext('2d')!;
  const dData = dCtx.createImageData(width, height);
  for (let i = 0; i < oData.length; i += 4) {
    if (oData[i] !== sData[i] || oData[i+1] !== sData[i+1] || oData[i+2] !== sData[i+2]) {
      dData.data[i] = 255; dData.data[i+3] = 255;
    }
  }
  dCtx.putImageData(dData, 0, 0);
  return diffCanvas.toDataURL();
};
