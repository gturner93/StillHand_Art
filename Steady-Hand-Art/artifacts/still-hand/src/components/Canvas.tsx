import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { Point, Stroke } from '@/lib/types';
import { smoothStrokes, drawStroke, analyzeTremor, clamp, floodFillToRaster } from '@/lib/drawing';

export default function Canvas() {
  const { strokes, setStrokes, settings, setSettings, appSettings } = useStore();
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const currentPointsRef = useRef<Point[]>([]);
  const previewBufferRef = useRef<Point[]>([]);
  const previewPointsRef = useRef<Point[]>([]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !baseCanvasRef.current || !activeCanvasRef.current) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      
      // Set actual pixel dimensions
      baseCanvasRef.current.width = width;
      baseCanvasRef.current.height = height;
      activeCanvasRef.current.width = width;
      activeCanvasRef.current.height = height;
      
      redrawBase();
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const redrawBase = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    strokes.forEach(stroke => {
      if (stroke.raster) {
        const img = new Image();
        img.src = stroke.raster;
        const x = stroke.rasterX ?? 0;
        const y = stroke.rasterY ?? 0;
        const w = stroke.rasterW ?? canvas.width;
        const h = stroke.rasterH ?? canvas.height;
        // drawImage async; use onload to ensure render
        img.onload = () => {
          ctx.drawImage(img, x, y, w, h);
        };
      } else {
        drawStroke(ctx, stroke.points, stroke.size, stroke.color, stroke.opacity, stroke.tool);
      }
    });
  }, [strokes]);

  // Redraw when strokes change
  useEffect(() => {
    redrawBase();
  }, [redrawBase]);

  const getCoordinates = (e: React.PointerEvent): Point => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
      timestamp: typeof e.timeStamp === 'number' ? e.timeStamp : performance.now(),
    };
  };

  const drawLiveStroke = (ctx: CanvasRenderingContext2D, points: Point[], tool: string) => {
    if (tool === 'eraser') {
      const baseCanvas = baseCanvasRef.current;
      if (!baseCanvas) return;

      const baseCtx = baseCanvas.getContext('2d');
      if (!baseCtx) return;

      baseCtx.save();
      baseCtx.globalCompositeOperation = 'destination-out';
      drawStroke(baseCtx, points, settings.brushSize, settings.brushColor, 1, tool);
      baseCtx.restore();

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      return;
    }

    if (tool === 'autofill') {
      // preview a filled shape on the active canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.globalAlpha = Math.min(0.9, settings.brushOpacity);
      ctx.fillStyle = settings.brushColor;

      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, settings.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
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
      }

      ctx.restore();
      return;
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawStroke(ctx, points, settings.brushSize, settings.brushColor, settings.brushOpacity, tool);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const point = getCoordinates(e);

    // If autofill tool, perform a bucket-fill on the base canvas at the clicked point
    if (settings.tool === 'autofill') {
      const baseCanvas = baseCanvasRef.current;
      const baseCtx = baseCanvas?.getContext('2d');
      if (!baseCanvas || !baseCtx) return;

      // Convert the brush color to RGBA components
      const hex = settings.brushColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      const a = Math.round((settings.brushOpacity ?? 1) * 255);

      const result = floodFillToRaster(baseCanvas, Math.round(point.x), Math.round(point.y), [r, g, b, a], 10);
      if (result) {
        const newStroke: Stroke = {
          id: crypto.randomUUID(),
          points: [point],
          color: settings.brushColor,
          size: settings.brushSize,
          opacity: settings.brushOpacity,
          tool: settings.tool,
          tremorScore: 0,
          tremorLevel: 'low',
          raster: result.dataUrl,
          rasterX: result.x,
          rasterY: result.y,
          rasterW: result.w,
          rasterH: result.h,
        };

        // draw the cropped raster back onto the base canvas (it already has the fill but ensure consistency)
        const img = new Image();
        img.onload = () => {
          baseCtx.drawImage(img, result.x, result.y, result.w, result.h);
        };
        img.src = result.dataUrl;

        setStrokes(prev => [...prev, newStroke]);
      }

      return; // don't start a freeform stroke for autofill
    }

    setIsDrawing(true);
    const nextPoints = [point];
    currentPointsRef.current = nextPoints;
    setCurrentPoints(nextPoints);
    previewBufferRef.current = [point];
    previewPointsRef.current = [point];

    const canvas = activeCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      drawLiveStroke(ctx, nextPoints, settings.tool);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;

    const newPoint = getCoordinates(e);
    setCurrentPoints(prev => {
      const next = [...prev, newPoint];
      currentPointsRef.current = next;

      const analysis = analyzeTremor(next);
      // If user explicitly sets stabilization to 0, do not apply adaptive smoothing.
      const adaptiveStabilization = settings.stabilization === 0 ? 0 : clamp(settings.stabilization + analysis.score * 0.6, 0, 1);
      setSettings({ tremorIntensity: analysis.score });

      // Maintain a small raw buffer for preview averaging
      previewBufferRef.current.push(newPoint);
      if (previewBufferRef.current.length > 16) previewBufferRef.current.shift();

      // adaptive window size: more tremor => larger averaging window
      const windowSize = settings.stabilization === 0
        ? 1
        : Math.max(1, Math.round(1 + analysis.score * 24 * settings.stabilization));
      const buf = previewBufferRef.current;
      const lastSlice = buf.slice(Math.max(0, buf.length - windowSize));
      let sumX = 0;
      let sumY = 0;
      let sumPressure = 0;
      for (let i = 0; i < lastSlice.length; i++) {
        const p = lastSlice[i];
        sumX += p.x;
        sumY += p.y;
        sumPressure += (p.pressure ?? 0);
      }
      const averagedPoint: Point = {
        x: sumX / lastSlice.length,
        y: sumY / lastSlice.length,
        pressure: lastSlice.length ? (sumPressure / lastSlice.length) : undefined
      };

      previewPointsRef.current = [...previewPointsRef.current, averagedPoint];
      if (previewPointsRef.current.length > 256) previewPointsRef.current.shift();

      // For live preview, use the averaged preview points (low-latency smoothing)
      const canvas = activeCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        drawLiveStroke(ctx, previewPointsRef.current, settings.tool);
      }
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const analysis = analyzeTremor(currentPointsRef.current);
    const adaptiveStabilization = settings.stabilization === 0 ? 0 : clamp(settings.stabilization + analysis.score * 0.6, 0, 1);
    const isGeometricTool = settings.tool === 'line' || settings.tool === 'rectangle' || settings.tool === 'circle';
    const finalPoints = isGeometricTool
      ? currentPointsRef.current
      : smoothStrokes(currentPointsRef.current, adaptiveStabilization);
    setSettings({ tremorIntensity: analysis.score });

    if (finalPoints.length > 0) {
      const tremorLevel = analysis.score > 0.6 ? 'high' : (analysis.score > 0.25 ? 'mild' : 'low');

      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        points: finalPoints,
        color: settings.brushColor,
        size: settings.brushSize,
        opacity: settings.brushOpacity,
        tool: settings.tool,
        tremorScore: Number(analysis.score.toFixed(3)),
        tremorLevel,
        tremorFrequencyHz: analysis.frequencyHz,
      };

      // Use drawStroke to render the committed stroke, including autofill behavior
      const baseCanvas = baseCanvasRef.current;
      const baseCtx = baseCanvas?.getContext('2d');
      if (baseCtx && baseCanvas) {
        drawStroke(baseCtx, newStroke.points, newStroke.size, newStroke.color, newStroke.opacity, newStroke.tool);
      }

      setStrokes(prev => [...prev, newStroke]);
    }

    currentPointsRef.current = [];
    setCurrentPoints([]);
    previewBufferRef.current = [];
    previewPointsRef.current = [];

    setSettings({ tremorIntensity: 0 });

    const canvas = activeCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-white rounded-xl shadow-sm border border-border overflow-hidden touch-none`}
      style={{ cursor: 'crosshair' }}
    >
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <canvas
        ref={activeCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerOut={handlePointerUp}
        className="absolute inset-0 w-full h-full touch-none"
      />
    </div>
  );
}
