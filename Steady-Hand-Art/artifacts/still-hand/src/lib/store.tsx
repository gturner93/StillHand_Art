import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Stroke, DrawingSettings, AppSettings, defaultDrawingSettings, defaultAppSettings } from './types';

interface StoreContextType {
  strokes: Stroke[];
  setStrokes: (strokes: Stroke[] | ((prev: Stroke[]) => Stroke[])) => void;
  undoHistory: Stroke[][];
  setUndoHistory: (history: Stroke[][] | ((prev: Stroke[][]) => Stroke[][])) => void;
  settings: DrawingSettings;
  setSettings: (settings: Partial<DrawingSettings>) => void;
  appSettings: AppSettings;
  setAppSettings: (settings: Partial<AppSettings>) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoHistory, setUndoHistory] = useState<Stroke[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Stroke[][]>([]);
  
  const [settings, setSettingsState] = useState<DrawingSettings>(() => {
    const saved = localStorage.getItem('sh_drawing_settings');
    return saved ? { ...defaultDrawingSettings, ...JSON.parse(saved) } : defaultDrawingSettings;
  });

  const [appSettings, setAppSettingsState] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('sh_app_settings');
    return saved ? { ...defaultAppSettings, ...JSON.parse(saved) } : defaultAppSettings;
  });

  const setSettings = (newSettings: Partial<DrawingSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...newSettings };
      localStorage.setItem('sh_drawing_settings', JSON.stringify(next));
      return next;
    });
  };

  const setAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettingsState(prev => {
      const next = { ...prev, ...newSettings };
      localStorage.setItem('sh_app_settings', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (appSettings.highContrast) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appSettings.highContrast]);

  const undo = () => {
    if (strokes.length === 0) return;
    const newStrokes = [...strokes];
    const popped = newStrokes.pop();
    if (popped) {
      setRedoHistory(prev => [...prev, [popped]]);
      setStrokes(newStrokes);
    }
  };

  const redo = () => {
    if (redoHistory.length === 0) return;
    const newRedo = [...redoHistory];
    const strokesToAdd = newRedo.pop();
    if (strokesToAdd) {
      setStrokes(prev => [...prev, ...strokesToAdd]);
      setRedoHistory(newRedo);
    }
  };

  const clear = () => {
    if (strokes.length > 0) {
      setRedoHistory([]);
      setStrokes([]);
    }
  };

  return (
    <StoreContext.Provider value={{
      strokes,
      setStrokes: (val) => {
        setStrokes(val);
        setRedoHistory([]); // Clear redo on new action
      },
      undoHistory,
      setUndoHistory,
      settings,
      setSettings,
      appSettings,
      setAppSettings,
      undo,
      redo,
      clear,
      canUndo: strokes.length > 0,
      canRedo: redoHistory.length > 0
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
}
