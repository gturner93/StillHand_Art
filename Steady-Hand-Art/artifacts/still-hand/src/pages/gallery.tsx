import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useStore } from "@/lib/store";
import { getAllDrawings, deleteDrawing, saveDrawing } from "@/lib/db";
import { Drawing } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit2, PenTool, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { drawStroke } from "@/lib/drawing";
import { format } from "date-fns";

export default function Gallery() {
  const { appSettings, setStrokes } = useStore();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadDrawings();
  }, []);

  const loadDrawings = async () => {
    const data = await getAllDrawings();
    setDrawings(data.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleOpen = (drawing: Drawing) => {
    setStrokes(drawing.strokes);
    setLocation("/");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this drawing?")) {
      await deleteDrawing(id);
      await loadDrawings();
    }
  };

  const handleRenameSubmit = async (drawing: Drawing) => {
    if (!editName.trim()) return;
    const updated = { ...drawing, name: editName, updatedAt: Date.now() };
    await saveDrawing(updated);
    setEditingId(null);
    await loadDrawings();
  };

  const renderThumbnail = (drawing: Drawing) => {
    return (
      <div className="w-full aspect-video bg-white relative rounded-md overflow-hidden border border-border">
        <canvas 
          className="absolute inset-0 w-full h-full pointer-events-none"
          ref={(canvas) => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = 400;
            canvas.height = 300;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(0.5, 0.5); 
            drawing.strokes.forEach(stroke => {
              drawStroke(ctx, stroke.points, stroke.size, stroke.color, stroke.opacity, stroke.tool);
            });
          }}
        />
      </div>
    );
  };

  return (
    <div className={`h-[100dvh] w-full flex overflow-hidden bg-background font-sans ${appSettings.uiScale > 1 ? 'text-lg' : 'text-base'}`}>
      <Sidebar />
      
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-serif text-foreground mb-4">Your Gallery</h1>
            <p className="text-muted-foreground text-lg">A safe space for all your creations.</p>
          </header>

          {drawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-border border-dashed">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                <PenTool className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-serif text-foreground mb-2">No drawings yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md">Your studio is ready. Head over to the canvas to start your first piece.</p>
              <Button onClick={() => setLocation("/")} size="lg" className="h-14 px-8 text-lg">
                Open Studio
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {drawings.map((drawing) => (
                // compute tremor summary for this drawing
                (() => {
                  const scores = drawing.strokes.map(s => s.tremorScore ?? 0);
                  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                  const maxScore = scores.length ? Math.max(...scores) : 0;
                  const overallLevel = maxScore > 0.6 ? 'high' : (maxScore > 0.25 ? 'mild' : 'low');
                  const levelLabel = overallLevel.charAt(0).toUpperCase() + overallLevel.slice(1);

                  const levelClass = overallLevel === 'high' ? 'bg-destructive text-destructive-foreground' : (overallLevel === 'mild' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-900');

                  return (
                    <Card key={drawing.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="p-4 pb-2">
                    {editingId === drawing.id ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(drawing)}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={() => handleRenameSubmit(drawing)}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg font-serif">{drawing.name}</CardTitle>
                          <div className={`px-2 py-0.5 rounded-full text-xs font-mono ${levelClass}`} title={`Tremor: ${Math.round(avgScore * 100)}% (${levelLabel})`}>{levelLabel}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditName(drawing.name);
                            setEditingId(drawing.id);
                          }}
                        >
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{format(drawing.updatedAt, 'PPP p')}</p>
                  </CardHeader>
                      <CardContent className="p-4 pt-2 relative">
                        {renderThumbnail(drawing)}
                        {/* per-stroke tremor badges overlay */}
                        <div className="absolute left-3 bottom-3 flex gap-1 pointer-events-none">
                          {drawing.strokes.map((s, idx) => {
                            const lvl = s.tremorLevel ?? 'low';
                            const color = lvl === 'high' ? 'bg-destructive' : (lvl === 'mild' ? 'bg-amber-400' : 'bg-emerald-500');
                            return (
                              <span key={s.id || idx} title={`Stroke ${idx + 1}: ${Math.round((s.tremorScore ?? 0) * 100)}%`} className={`${color} w-3 h-3 rounded-full shadow-sm`} />
                            );
                          })}
                        </div>
                      </CardContent>
                  <CardFooter className="p-4 bg-muted/30 border-t border-border flex justify-between">
                    <Button variant="default" onClick={() => handleOpen(drawing)} className={appSettings.largeTouchTargets ? 'h-12 px-6' : ''}>
                      Open
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className={`text-destructive hover:bg-destructive/10 hover:text-destructive ${appSettings.largeTouchTargets ? 'h-12 w-12' : ''}`} 
                        onClick={() => handleDelete(drawing.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                    </Card>
                  );
                })()
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
