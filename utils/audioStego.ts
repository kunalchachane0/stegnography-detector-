
/**
 * StegnoSafe Audio Engine
 * Implements LSB steganography for 16-bit PCM WAV files.
 * Protocol: [32-bit Header] + [Payload]
 */

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
}

export const parseWavHeader = (buffer: ArrayBuffer): WavInfo => {
  const view = new DataView(buffer);
  
  // Check RIFF header
  if (view.getUint32(0, true) !== 0x46464952) throw new Error("Not a RIFF file");
  if (view.getUint32(8, true) !== 0x45564157) throw new Error("Not a WAV file");

  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bitsPerSample = view.getUint16(34, true);

  // Find 'data' chunk
  let offset = 12;
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) break;
    const chunkId = view.getUint32(offset, true);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 0x61746164) { // 'data'
      return { sampleRate, channels, bitsPerSample, dataOffset: offset + 8 };
    }
    offset += 8 + chunkSize;
  }
  
  throw new Error("Could not find data chunk in WAV");
};

export const calculateAudioCapacity = (buffer: ArrayBuffer): number => {
  try {
    const info = parseWavHeader(buffer);
    const samplesAvailable = (buffer.byteLength - info.dataOffset) / 2;
    return Math.max(0, Math.floor(samplesAvailable / 8) - 4); // -4 for 32-bit length header
  } catch (e) {
    return 0;
  }
};

export const encodeAudioLSB = (buffer: ArrayBuffer, payload: Uint8Array): ArrayBuffer => {
  const info = parseWavHeader(buffer);
  if (info.bitsPerSample !== 16) throw new Error("Only 16-bit WAV supported");

  const newBuffer = buffer.slice(0);
  const view = new DataView(newBuffer);
  
  // 32-bit length header (BE)
  const header = new ArrayBuffer(4);
  new DataView(header).setUint32(0, payload.length, false);
  const combined = new Uint8Array(4 + payload.length);
  combined.set(new Uint8Array(header), 0);
  combined.set(payload, 4);

  const totalBits = combined.length * 8;
  const samplesAvailable = (buffer.byteLength - info.dataOffset) / 2;
  if (totalBits > samplesAvailable) throw new Error("Audio file too short for message");

  for (let i = 0; i < totalBits; i++) {
    const byteIdx = Math.floor(i / 8);
    const bitIdx = 7 - (i % 8);
    const bit = (combined[byteIdx] >> bitIdx) & 1;

    const sampleOffset = info.dataOffset + (i * 2);
    let sample = view.getInt16(sampleOffset, true);
    sample = (sample & ~1) | bit;
    view.setInt16(sampleOffset, sample, true);
  }

  return newBuffer;
};

export const decodeAudioLSB = (buffer: ArrayBuffer): Uint8Array => {
  const info = parseWavHeader(buffer);
  const view = new DataView(buffer);
  const samplesAvailable = (buffer.byteLength - info.dataOffset) / 2;

  // Extract 32-bit length header
  const lengthBits = [];
  for (let i = 0; i < 32; i++) {
    const offset = info.dataOffset + (i * 2);
    lengthBits.push(view.getInt16(offset, true) & 1);
  }

  const lengthBuffer = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte |= (lengthBits[i * 8 + b] << (7 - b));
    }
    lengthBuffer[i] = byte;
  }
  const payloadLength = new DataView(lengthBuffer.buffer).getUint32(0, false);

  if (payloadLength === 0 || payloadLength > (samplesAvailable - 32) / 8) {
    throw new Error("No valid audio payload detected.");
  }

  // Extract payload
  const result = new Uint8Array(payloadLength);
  for (let i = 0; i < payloadLength; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      const bitIdx = 32 + (i * 8) + b;
      const offset = info.dataOffset + (bitIdx * 2);
      const bit = view.getInt16(offset, true) & 1;
      byte |= (bit << (7 - b));
    }
    result[i] = byte;
  }

  return result;
};
