import { Point } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface TremorAnalysis {
  score: number;
  amplitude: number;
  jitter: number;
  frequencyHz: number;
  detected: boolean;
}

export function analyzeTremor(points: Point[]): TremorAnalysis {
  if (points.length < 4) {
    return { score: 0, amplitude: 0, jitter: 0, frequencyHz: 0, detected: false };
  }

  let totalDistance = 0;
  let meanSpeed = 0;
  let speedVariance = 0;
  let jitter = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distance = Math.hypot(dx, dy);
    totalDistance += distance;
  }

  const travel = totalDistance / (points.length - 1);
  if (travel < 0.2) {
    return { score: 0, amplitude: 0, jitter: 0, frequencyHz: 0, detected: false };
  }

  const speeds: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const speed = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    speeds.push(speed);
  }

  meanSpeed = speeds.reduce((sum, value) => sum + value, 0) / speeds.length;
  speedVariance = speeds.reduce((sum, value) => sum + (value - meanSpeed) ** 2, 0) / speeds.length;

  for (let i = 2; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const prevDelta = { x: prev.x - points[i - 2].x, y: prev.y - points[i - 2].y };
    const nextDelta = { x: next.x - curr.x, y: next.y - curr.y };

    const prevAngle = Math.atan2(prevDelta.y, prevDelta.x);
    const nextAngle = Math.atan2(nextDelta.y, nextDelta.x);
    const angleDelta = Math.abs(prevAngle - nextAngle);
    const directionSwing = Math.min(angleDelta, Math.PI * 2 - angleDelta) / Math.PI;

    const localJitter = directionSwing * (Math.hypot(prevDelta.x, prevDelta.y) + Math.hypot(nextDelta.x, nextDelta.y)) * 0.5;
    jitter += localJitter;
  }

  jitter = jitter / Math.max(1, points.length - 3);
  const amplitude = clamp(Math.sqrt(speedVariance) / Math.max(meanSpeed, 1), 0, 1);
  const score = clamp((amplitude * 0.7) + (jitter / Math.max(travel, 1) * 1.4), 0, 1);
  const durationMs = points[points.length - 1].timestamp! - points[0].timestamp!;
  const directionChanges = points.slice(2).filter((_, index) => {
    const previous = points[index];
    const current = points[index + 1];
    const next = points[index + 2];
    const firstVelocity = { x: current.x - previous.x, y: current.y - previous.y };
    const secondVelocity = { x: next.x - current.x, y: next.y - current.y };
    return firstVelocity.x * secondVelocity.x + firstVelocity.y * secondVelocity.y < 0;
  }).length;
  const frequencyHz = Number.isFinite(durationMs) && durationMs > 0
    ? Number((directionChanges / 2 / (durationMs / 1000)).toFixed(2))
    : 0;

  return {
    score,
    amplitude,
    jitter: clamp(jitter / Math.max(travel, 1), 0, 1),
    frequencyHz,
    detected: score > 0.32,
  };
}

// Stronger tremor filtering: high stabilization values now collapse the jitter much
// more aggressively while still preserving the overall stroke path.
export function smoothStrokes(points: Point[], stabilization: number): Point[] {
  if (points.length < 3 || stabilization <= 0) {
    return points;
  }

  const clamped = Math.max(0, Math.min(1, stabilization));
  let smoothed: Point[] = points.map(point => ({ ...point }));
  const correctionStrength = 0.35 + clamped * 0.6;
  const correctionRadius = Math.max(1, Math.round(clamped * 4));
  const passes = Math.max(1, Math.round(clamped * 12));

  for (let pass = 0; pass < passes; pass++) {
    const next = smoothed.map(point => ({ ...point }));
    for (let i = 1; i < smoothed.length - 1; i++) {
      const current = smoothed[i];
      const start = Math.max(0, i - correctionRadius);
      const end = Math.min(smoothed.length - 1, i + correctionRadius);
      let sumX = 0;
      let sumY = 0;
      let sampleCount = 0;
      for (let sample = start; sample <= end; sample++) {
        sumX += smoothed[sample].x;
        sumY += smoothed[sample].y;
        sampleCount++;
      }
      const targetX = sumX / sampleCount;
      const targetY = sumY / sampleCount;
      next[i] = {
        ...current,
        x: current.x + (targetX - current.x) * correctionStrength,
        y: current.y + (targetY - current.y) * correctionStrength,
      };
    }
    smoothed = next;
  }

  const pathLength = (path: Point[]) => path.reduce((length, point, index) => {
    if (index === 0) return length;
    return length + Math.hypot(point.x - path[index - 1].x, point.y - path[index - 1].y);
  }, 0);
  const originalLength = pathLength(points);
  const smoothedLength = pathLength(smoothed);
  if (smoothedLength > 0 && originalLength > 0) {
    const scale = originalLength / smoothedLength;
    const origin = smoothed[0];
    for (let i = 1; i < smoothed.length; i++) {
      smoothed[i] = {
        ...smoothed[i],
        x: origin.x + (smoothed[i].x - origin.x) * scale,
        y: origin.y + (smoothed[i].y - origin.y) * scale,
      };
    }
  }

  return smoothed;
}

// Convex hull (Monotone chain) for a set of points
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  const pts = points.map(p => ({ x: p.x, y: p.y }));
  pts.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  const cross = (o: any, a: any, b: any) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: any[] = [];
  for (let p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }

  const upper: any[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  const hull = lower.concat(upper);
  return hull.map((p: any) => ({ x: p.x, y: p.y }));
}

// Flood fill with scanline algorithm. Returns a cropped dataURL and bbox of modified region.
export function floodFillToRaster(canvas: HTMLCanvasElement, startX: number, startY: number, fillColor: [number, number, number, number], tolerance = 0) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const getIndex = (x: number, y: number) => (y * w + x) * 4;

  const startIdx = getIndex(startX, startY);
  const target = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];

  // If target color is already roughly equal to fillColor, skip
  if (Math.abs(target[0] - fillColor[0]) <= tolerance && Math.abs(target[1] - fillColor[1]) <= tolerance && Math.abs(target[2] - fillColor[2]) <= tolerance && Math.abs(target[3] - fillColor[3]) <= tolerance) {
    return null;
  }

  const visited = new Uint8Array(w * h);
  const stack: [number, number][] = [[startX, startY]];

  let minX = w, minY = h, maxX = 0, maxY = 0;

  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const idx = y * w + x;
    if (visited[idx]) continue;

    const i = idx * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (Math.abs(r - target[0]) <= tolerance && Math.abs(g - target[1]) <= tolerance && Math.abs(b - target[2]) <= tolerance && Math.abs(a - target[3]) <= tolerance) {
      // paint
      data[i] = fillColor[0];
      data[i + 1] = fillColor[1];
      data[i + 2] = fillColor[2];
      data[i + 3] = fillColor[3];

      visited[idx] = 1;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
  }

  ctx.putImageData(image, 0, 0);

  if (minX > maxX || minY > maxY) return null;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const tmp = document.createElement('canvas');
  tmp.width = bw;
  tmp.height = bh;
  const tctx = tmp.getContext('2d');
  if (!tctx) return null;
  const slice = ctx.getImageData(minX, minY, bw, bh);
  tctx.putImageData(slice, 0, 0);

  const dataUrl = tmp.toDataURL('image/png');
  return { dataUrl, x: minX, y: minY, w: bw, h: bh };
}

export function drawStroke(ctx: CanvasRenderingContext2D, points: Point[], size: number, color: string, opacity: number, tool: string) {
  if (points.length === 0) return;

  ctx.globalAlpha = opacity;
  
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  }

  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'line') {
    if (points.length < 2) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const start = points[0];
    const end = points[points.length - 1];
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    return;
  }

  if (tool === 'rectangle') {
    if (points.length < 2) return;
    const start = points[0];
    const end = points[points.length - 1];
    ctx.beginPath();
    ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
    ctx.stroke();
    return;
  }

  if (tool === 'circle') {
    if (points.length < 2) return;
    const start = points[0];
    const end = points[points.length - 1];
    const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (tool === 'autofill') {
    // Fill the smoothed path
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // If the stroke is roughly closed (start and end near), fill the smoothed path.
    const first = points[0];
    const last = points[points.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist = Math.hypot(dx, dy);
    const closeThreshold = Math.max(10, size * 2);

    if (dist <= closeThreshold) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Otherwise compute a convex hull of the points and fill that polygon — this
    // gives a reasonable filled region for open but loop-like strokes.
    const hull = convexHull(points);
    if (hull.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(hull[0].x, hull[0].y);
      for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i].x, hull[i].y);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  // Regular brush/eraser
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  // Use quadratic curves for smoother rendering
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  
  // curve through the last two points
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}
