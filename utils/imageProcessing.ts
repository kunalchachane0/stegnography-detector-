
export const getBitPlane = (
  canvas: HTMLCanvasElement,
  channel: 'R' | 'G' | 'B' | 'Y' | 'Cb' | 'Cr',
  plane: number // 0-7, where 0 is LSB
): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const output = ctx.createImageData(canvas.width, canvas.height);
  const outData = output.data;

  const bit = 1 << plane;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    let val = 0;
    if (channel === 'R') val = r;
    else if (channel === 'G') val = g;
    else if (channel === 'B') val = b;
    else {
      // YCbCr conversion
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      if (channel === 'Y') val = y;
      else if (channel === 'Cb') val = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      else if (channel === 'Cr') val = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }

    const isSet = (Math.round(val) & bit) !== 0;
    const color = isSet ? 255 : 0;

    outData[i] = color;
    outData[i + 1] = color;
    outData[i + 2] = color;
    outData[i + 3] = 255;
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCanvas.getContext('2d')?.putImageData(output, 0, 0);
  return tempCanvas.toDataURL();
};

export const getNoiseFilter = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const output = ctx.createImageData(canvas.width, canvas.height);
  const outData = output.data;

  for (let y = 0; y < canvas.height - 1; y++) {
    for (let x = 0; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      const nextIdx = (y * canvas.width + (x + 1)) * 4;
      
      for (let c = 0; c < 3; c++) {
        const diff = Math.abs(data[idx + c] - data[nextIdx + c]);
        outData[idx + c] = Math.min(diff * 12, 255); 
      }
      outData[idx + 3] = 255;
    }
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCanvas.getContext('2d')?.putImageData(output, 0, 0);
  return tempCanvas.toDataURL();
};

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
}

export const getHistogramData = (canvas: HTMLCanvasElement): HistogramData => {
  const ctx = canvas.getContext('2d');
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);

  if (!ctx) return { r, g, b };

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i+1]]++;
    b[data[i+2]]++;
  }

  return { r, g, b };
};
