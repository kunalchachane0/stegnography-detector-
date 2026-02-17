
/**
 * StegnoSafe Advanced Bit-Level Engine
 * Protocol: [32-bit Header] + [Encrypted Payload]
 * Feature: Pseudo-Random Bit Scattering (Seeded by Password)
 */

// Simple PRNG for index scattering
class SeededRandom {
  private state: number;
  constructor(seed: string) {
    this.state = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0) || 1;
  }
  next() {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
}

export const calculateCapacity = (width: number, height: number): number => {
  const totalBits = width * height * 3;
  const availableBytes = Math.floor(totalBits / 8) - 4;
  return Math.max(0, availableBytes);
};

/**
 * Returns a pseudo-random permutation of indices for bit placement
 */
const getScatteredIndices = (totalPixels: number, seed: string): number[] => {
  const indices = Array.from({ length: totalPixels }, (_, i) => i);
  if (!seed) return indices;

  const rng = new SeededRandom(seed);
  // Fisher-Yates shuffle with seeded RNG
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
};

export const encodeMessage = (
  imageData: ImageData,
  payload: Uint8Array,
  password?: string
): ImageData => {
  const data = imageData.data;
  const msgLength = payload.length;
  const totalPixels = data.length / 4;

  // 1. Create bitstream: [32-bit Length (BE)] + [Payload Bytes]
  const buffer = new ArrayBuffer(4 + msgLength);
  const view = new DataView(buffer);
  view.setUint32(0, msgLength, false);
  const combinedBytes = new Uint8Array(4 + msgLength);
  combinedBytes.set(new Uint8Array(buffer, 0, 4));
  combinedBytes.set(payload, 4);

  const totalBitsNeeded = combinedBytes.length * 8;
  if (totalBitsNeeded > totalPixels * 3) {
    throw new Error('Payload exceeds image capacity.');
  }

  // Use scattering if password is provided
  const pixelIndices = password ? getScatteredIndices(totalPixels, password) : Array.from({length: totalPixels}, (_, i) => i);

  let bitIdx = 0;
  for (const pixelIdx of pixelIndices) {
    if (bitIdx >= totalBitsNeeded) break;
    const baseIdx = pixelIdx * 4;

    for (let channel = 0; channel < 3; channel++) {
      if (bitIdx >= totalBitsNeeded) break;
      
      const byteIdx = Math.floor(bitIdx / 8);
      const bitOffset = 7 - (bitIdx % 8);
      const bit = (combinedBytes[byteIdx] >> bitOffset) & 1;

      data[baseIdx + channel] = (data[baseIdx + channel] & ~1) | bit;
      bitIdx++;
    }
  }

  return imageData;
};

export const decodeMessage = (imageData: ImageData, password?: string): Uint8Array => {
  const data = imageData.data;
  const totalPixels = data.length / 4;
  const pixelIndices = password ? getScatteredIndices(totalPixels, password) : Array.from({length: totalPixels}, (_, i) => i);

  // 1. Extract Length Header (first 32 bits)
  const lengthBits: number[] = [];
  let bitsFound = 0;
  
  outerHeader: for (const pixelIdx of pixelIndices) {
    const baseIdx = pixelIdx * 4;
    for (let channel = 0; channel < 3; channel++) {
      lengthBits.push(data[baseIdx + channel] & 1);
      bitsFound++;
      if (bitsFound === 32) break outerHeader;
    }
  }

  const lengthBuffer = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte |= (lengthBits[i * 8 + b] << (7 - b));
    }
    lengthBuffer[i] = byte;
  }
  
  const msgLength = new DataView(lengthBuffer.buffer).getUint32(0, false);
  if (msgLength === 0 || msgLength > (totalPixels * 3) / 8) {
    throw new Error('No valid LSB payload detected.');
  }

  // 2. Extract Payload
  const totalBitsToExtract = msgLength * 8;
  const messageBits: number[] = [];
  let extractedCount = 0;
  let headerBitsPassed = 0;

  outerPayload: for (const pixelIdx of pixelIndices) {
    const baseIdx = pixelIdx * 4;
    for (let channel = 0; channel < 3; channel++) {
      if (headerBitsPassed < 32) {
        headerBitsPassed++;
        continue;
      }
      if (extractedCount >= totalBitsToExtract) break outerPayload;
      messageBits.push(data[baseIdx + channel] & 1);
      extractedCount++;
    }
  }

  const resultBytes = new Uint8Array(msgLength);
  for (let i = 0; i < msgLength; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte |= (messageBits[i * 8 + b] << (7 - b));
    }
    resultBytes[i] = byte;
  }

  return resultBytes;
};
