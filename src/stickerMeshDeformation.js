export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return t * t * (3 - 2 * t);
}

export function createStickerGrid(width, height, columns, rows) {
  const vertexColumns = columns + 1;
  const vertexRows = rows + 1;
  const vertices = [];
  const positions = new Float32Array(vertexColumns * vertexRows * 2);
  const shadowPositions = new Float32Array(vertexColumns * vertexRows * 2);
  const uvs = new Float32Array(vertexColumns * vertexRows * 2);
  const indices = new Uint32Array(columns * rows * 6);

  let vertexIndex = 0;
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const baseX = (column / columns) * width;
      const baseY = (row / rows) * height;
      vertices.push({ baseX, baseY, x: baseX, y: baseY, column, row });
      positions[vertexIndex * 2] = baseX;
      positions[vertexIndex * 2 + 1] = baseY;
      shadowPositions[vertexIndex * 2] = baseX;
      shadowPositions[vertexIndex * 2 + 1] = baseY;
      uvs[vertexIndex * 2] = column / columns;
      uvs[vertexIndex * 2 + 1] = row / rows;
      vertexIndex += 1;
    }
  }

  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * vertexColumns + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + vertexColumns;
      const bottomRight = bottomLeft + 1;
      indices[index] = topLeft;
      indices[index + 1] = topRight;
      indices[index + 2] = bottomRight;
      indices[index + 3] = topLeft;
      indices[index + 4] = bottomRight;
      indices[index + 5] = bottomLeft;
      index += 6;
    }
  }

  return { vertices, positions, shadowPositions, uvs, indices, vertexColumns, vertexRows };
}

export function getPeelCorner(localPointer, width, height) {
  const horizontal = localPointer.x < width / 2 ? 'left' : 'right';
  const vertical = localPointer.y < height / 2 ? 'top' : 'bottom';
  return `${vertical}-${horizontal}`;
}

export function getCornerPoint(peelCorner, width, height) {
  if (peelCorner === 'bottom-edge') {
    return { x: width / 2, y: height };
  }
  return {
    x: peelCorner.endsWith('left') ? 0 : width,
    y: peelCorner.startsWith('top') ? 0 : height,
  };
}

export function normalizedDistanceFromCorner(vertex, peelCorner, width, height) {
  if (peelCorner === 'bottom-edge') {
    return clamp((height - vertex.baseY) / Math.max(height, 0.0001), 0, 1);
  }
  const corner = getCornerPoint(peelCorner, width, height);
  return clamp(Math.hypot(vertex.baseX - corner.x, vertex.baseY - corner.y) / Math.hypot(width, height), 0, 1);
}

export function applyPeelDeformation({
  vertices,
  positions,
  shadowPositions,
  width,
  height,
  peelCorner,
  pointerDelta,
  peelProgress,
  feather,
  curlAmount,
  curlWidth,
  floatingTipCurlAmount = 0,
  floatingTipCurlWidth = 0.08,
  perspectiveAmount,
  shadowOffset,
  reducedMotion = false,
}) {
  const progress = clamp(peelProgress, 0, 1);
  const centerX = width / 2;
  const centerY = height / 2;
  const dragLength = Math.max(Math.hypot(pointerDelta.x, pointerDelta.y), 1);
  const direction = {
    x: pointerDelta.x / dragLength,
    y: pointerDelta.y / dragLength,
  };
  const normal = peelCorner === 'bottom-edge'
    ? { x: 0, y: -1 }
    : {
      x: -direction.y,
      y: direction.x,
    };
  const effectiveCurl = reducedMotion ? curlAmount * 0.25 : curlAmount;
  let maxDetachedWeight = 0;

  vertices.forEach((vertex, index) => {
    const distanceFromPeelCorner = normalizedDistanceFromCorner(vertex, peelCorner, width, height);
    const detachedWeight = progress >= 0.98
      ? 1
      : 1 - smoothstep(progress - feather, progress + feather, distanceFromPeelCorner);
    const boundaryDistance = Math.abs(distanceFromPeelCorner - progress);
    const curl = Math.exp(-(boundaryDistance * boundaryDistance) / (2 * curlWidth * curlWidth));
    const attachedWeight = 1 - detachedWeight;
    const perspectiveScale = 1 + detachedWeight * perspectiveAmount;
    const curlDirection = peelCorner === 'bottom-edge'
      ? 1
      : peelCorner.endsWith('left') === peelCorner.startsWith('top') ? 1 : -1;
    const floatingTipDistance = Math.abs(distanceFromPeelCorner - 1);
    const floatingTipCurl = progress >= 0.98
      ? Math.exp(-(floatingTipDistance * floatingTipDistance) / (2 * floatingTipCurlWidth * floatingTipCurlWidth))
      : 0;
    const horizontalCrown = 0.72 + 0.28 * Math.sin((vertex.baseX / Math.max(width, 0.0001)) * Math.PI);
    const xFromCenter = vertex.baseX - centerX;
    const yFromCenter = vertex.baseY - centerY;

    vertex.x = centerX + xFromCenter * perspectiveScale + pointerDelta.x * detachedWeight;
    vertex.y = centerY + yFromCenter * perspectiveScale + pointerDelta.y * detachedWeight;
    vertex.x += normal.x * curl * effectiveCurl * curlDirection * attachedWeight;
    vertex.y += normal.y * curl * effectiveCurl * curlDirection * attachedWeight;
    vertex.x += normal.x * floatingTipCurl * floatingTipCurlAmount * horizontalCrown * curlDirection;
    vertex.y += normal.y * floatingTipCurl * floatingTipCurlAmount * horizontalCrown * curlDirection;

    positions[index * 2] = vertex.x;
    positions[index * 2 + 1] = vertex.y;

    const liftedShadow = detachedWeight * shadowOffset;
    shadowPositions[index * 2] = vertex.x + direction.x * liftedShadow * 0.35;
    shadowPositions[index * 2 + 1] = vertex.y + liftedShadow;
    maxDetachedWeight = Math.max(maxDetachedWeight, detachedWeight);
  });

  return { maxDetachedWeight };
}
