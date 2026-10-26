// Deterministic triangle filtering avoids browser-dependent aliasing of CAD
// hatching, dimension lines and furniture strokes when reducing a large scan.
export function resizeRecognitionImage(image, maxEdge = 900) {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  if (scale === 1) return image;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const weights = (sourceSize, targetSize) => Array.from({ length: targetSize }, (_, p) => {
    const ratio = sourceSize / targetSize, center = (p + 0.5) * ratio;
    const entries = [];
    let total = 0;
    for (let i = Math.max(0, Math.floor(center - ratio)); i < Math.min(sourceSize, Math.ceil(center + ratio)); i += 1) {
      const weight = Math.max(0, 1 - Math.abs(i + 0.5 - center) / ratio);
      entries.push([i, weight]); total += weight;
    }
    return entries.map(([i, weight]) => [i, weight / total]);
  });
  const horizontal = weights(image.width, width), vertical = weights(image.height, height);
  const intermediate = new Uint8ClampedArray(width * image.height * 4);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 4; channel += 1) {
        let value = 0;
        for (const [sourceX, weight] of horizontal[x]) value += image.data[(y * image.width + sourceX) * 4 + channel] * weight;
        intermediate[(y * width + x) * 4 + channel] = Math.round(value);
      }
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 4; channel += 1) {
        let value = 0;
        for (const [sourceY, weight] of vertical[y]) value += intermediate[(sourceY * width + x) * 4 + channel] * weight;
        data[(y * width + x) * 4 + channel] = Math.round(value);
      }
    }
  }
  return { width, height, data };
}
