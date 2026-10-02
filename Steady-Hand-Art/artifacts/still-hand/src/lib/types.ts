export interface DrawingSettings {
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  stabilization: number; // 0 to 1
  tremorIntensity: number; // 0 to 1, live calculated from pointer jitter
  tool: 'brush' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'autofill';
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  tool: 'brush' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'autofill';
  // Tremor metadata captured when the stroke is committed
  tremorScore?: number; // 0..1
  tremorLevel?: 'low' | 'mild' | 'high';
  tremorFrequencyHz?: number;
  // Optional raster snapshot for tools like autofill (cropped data URL)
  raster?: string;
  rasterX?: number;
  rasterY?: number;
  rasterW?: number;
  rasterH?: number;
}

export interface Drawing {
  id: string;
  name: string;
  strokes: Stroke[];
  thumbnail?: string;
  updatedAt: number;
}

export interface AppSettings {
  largeTouchTargets: boolean;
  uiScale: number;
  highContrast: boolean;
  reducedMotion: boolean;
}

export const defaultDrawingSettings: DrawingSettings = {
  brushSize: 5,
  brushColor: '#203A30', // A nice dark sage
  brushOpacity: 1,
  stabilization: 0.8, // Default to fairly strong stabilization
  tremorIntensity: 0,
  tool: 'brush',
};

export const defaultAppSettings: AppSettings = {
  largeTouchTargets: true,
  uiScale: 1,
  highContrast: false,
  reducedMotion: false,
};
