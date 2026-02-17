
/**
 * StegnoSafe Audio Engine
 * Implements LSB steganography for 16-bit PCM WAV files.
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
    return Math.floor(samplesAvailable / 8) - 1; // -1 for null terminator
  } catch (e) {
    return 0;
  }
};

export const encodeAudioLSB = (buffer: ArrayBuffer, message: string): ArrayBuffer => {
  const info = parseWavHeader(buffer);
  if (info.bitsPerSample !== 16) throw new Error("Only 16-bit WAV supported for now");

  const newBuffer = buffer.slice(0);
  const view = new DataView(newBuffer);
  const payload = new TextEncoder().encode(message + '\0'); // Null terminator
  const totalBits = payload.length * 8;

  const samplesAvailable = (buffer.byteLength - info.dataOffset) / 2;
  if (totalBits > samplesAvailable) throw new Error("Audio file too short for message");

  for (let i = 0; i < totalBits; i++) {
    const byteIdx = Math.floor(i / 8);
    const bitIdx = 7 - (i % 8);
    const bit = (payload[byteIdx] >> bitIdx) & 1;

    const sampleOffset = info.dataOffset + (i * 2);
    let sample = view.getInt16(sampleOffset, true);
    
    // Modify LSB
    sample = (sample & ~1) | bit;
    view.setInt16(sampleOffset, sample, true);
  }

  return newBuffer;
};

export const decodeAudioLSB = (buffer: ArrayBuffer): string => {
  const info = parseWavHeader(buffer);
  const view = new DataView(buffer);
  const samplesAvailable = (buffer.byteLength - info.dataOffset) / 2;

  let bytes = [];
  let currentByte = 0;
  let bitCount = 0;

  for (let i = 0; i < samplesAvailable; i++) {
    const sampleOffset = info.dataOffset + (i * 2);
    const sample = view.getInt16(sampleOffset, true);
    const bit = sample & 1;

    currentByte = (currentByte << 1) | bit;
    bitCount++;

    if (bitCount === 8) {
      if (currentByte === 0) break;
      bytes.push(currentByte);
      currentByte = 0;
      bitCount = 0;
    }
    if (bytes.length > 10000) break; // Safety limit
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
};
