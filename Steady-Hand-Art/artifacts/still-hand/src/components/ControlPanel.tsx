import { useStore } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Brush, Eraser, Minus, Square, Circle } from "lucide-react";

const PALETTE = [
  '#202020', // Charcoal
  '#5F7367', // Sage
  '#D98364', // Terracotta
  '#E6B971', // Mustard
  '#7C98B3', // Soft Blue
  '#F7F4EB', // Cream
];

export default function ControlPanel() {
  const { settings, setSettings, appSettings } = useStore();

  const handleToolChange = (tool: typeof settings.tool) => {
    setSettings({ tool });
  };

  const Tools = [
    { id: 'brush', icon: Brush, label: 'Brush' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'rectangle', icon: Square, label: 'Box' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'autofill', icon: Square, label: 'Autofill' },
  ] as const;

  const btnClass = appSettings.largeTouchTargets ? "h-14" : "h-10";

  return (
    <div className="w-80 bg-card border-l border-border h-full flex flex-col py-6 px-6 overflow-y-auto shrink-0 shadow-sm z-10">
      
      {/* Stabilization Control - The Star Feature */}
      <div className="mb-10 bg-primary/5 p-4 rounded-xl border border-primary/20">
        <div className="flex justify-between items-center mb-2">
          <Label className="font-semibold text-primary">Tremor Filter</Label>
          <span className="text-sm font-mono text-primary/80">{Math.round(settings.stabilization * 100)}%</span>
        </div>
        <Slider 
          value={[settings.stabilization * 100]} 
          onValueChange={(val) => setSettings({ stabilization: val[0] / 100 })}
          max={100}
          step={1}
          className="mb-2"
        />
        <div className="flex items-center justify-between text-[11px] mt-2">
          <span className="text-muted-foreground">Detected</span>
          <span className="font-mono text-primary">{Math.round(settings.tremorIntensity * 100)}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {settings.tremorIntensity > 0.6
            ? 'High tremor detected — smoothing is activating in real time.'
            : settings.tremorIntensity > 0.25
              ? 'Mild tremor detected — the filter is compensating.'
              : 'No meaningful tremor detected.'}
        </p>
      </div>

      {/* Tools */}
      <div className="mb-8">
        <Label className="font-medium text-foreground mb-4 block">Drawing Tool</Label>
        <div className="grid grid-cols-2 gap-2">
          {Tools.map((t) => (
            <Button
              key={t.id}
              variant={settings.tool === t.id ? "default" : "outline"}
              className={`${btnClass} flex items-center justify-start gap-2 px-3`}
              onClick={() => handleToolChange(t.id)}
            >
              <t.icon className="h-4 w-4" />
              <span className="text-sm">{t.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Brush Size */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <Label className="font-medium text-foreground">Stroke Size</Label>
          <span className="text-sm font-mono text-muted-foreground">{settings.brushSize}px</span>
        </div>
        <Slider 
          value={[settings.brushSize]} 
          onValueChange={(val) => setSettings({ brushSize: val[0] })}
          max={50}
          min={1}
          step={1}
        />
      </div>

      {/* Brush Opacity */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <Label className="font-medium text-foreground">Opacity</Label>
          <span className="text-sm font-mono text-muted-foreground">{Math.round(settings.brushOpacity * 100)}%</span>
        </div>
        <Slider 
          value={[settings.brushOpacity * 100]} 
          onValueChange={(val) => setSettings({ brushOpacity: val[0] / 100 })}
          max={100}
          min={5}
          step={5}
        />
      </div>

      {/* Color Palette */}
      {settings.tool !== 'eraser' && (
        <div className="mb-8">
          <Label className="font-medium text-foreground mb-4 block">Ink Color</Label>
          <div className="grid grid-cols-3 gap-3">
            {PALETTE.map((color) => (
              <button
                key={color}
                className={`
                  w-full aspect-square rounded-full border-4 transition-transform
                  ${settings.brushColor === color ? 'border-primary scale-110 shadow-md' : 'border-transparent hover:scale-105'}
                `}
                style={{ backgroundColor: color }}
                onClick={() => setSettings({ brushColor: color })}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
