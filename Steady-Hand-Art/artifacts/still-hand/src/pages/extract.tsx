import { useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export default function Extract() {
  const { strokes, appSettings } = useStore();
  const { toast } = useToast();

  const exportPayload = useMemo(() => {
    const recording = {
      version: 1,
      exportedAt: new Date().toISOString(),
      summary: {
        strokeCount: strokes.length,
        totalPoints: strokes.reduce((sum, stroke) => sum + stroke.points.length, 0),
      },
      strokes: strokes.map((stroke) => ({
        id: stroke.id,
        tool: stroke.tool,
        color: stroke.color,
        size: stroke.size,
        opacity: stroke.opacity,
        tremorScore: stroke.tremorScore ?? 0,
        tremorLevel: stroke.tremorLevel ?? 'low',
        tremorFrequencyHz: stroke.tremorFrequencyHz ?? 0,
        raster: stroke.raster ?? null,
        rasterX: stroke.rasterX ?? null,
        rasterY: stroke.rasterY ?? null,
        rasterW: stroke.rasterW ?? null,
        rasterH: stroke.rasterH ?? null,
        points: stroke.points.map((point) => ({
          x: Number(point.x.toFixed(2)),
          y: Number(point.y.toFixed(2)),
          pressure: point.pressure ?? null,
          timestamp: point.timestamp ?? null,
        })),
      })),
    };

    return JSON.stringify(recording, null, 2);
  }, [strokes]);

  const handleCopy = async () => {
    if (strokes.length === 0) {
      toast({ title: "No stroke data", description: "Draw something before exporting a recording." });
      return;
    }

    try {
      await navigator.clipboard.writeText(exportPayload);
      toast({ title: "Stroke recording copied", description: "The JSON payload is now on your clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (strokes.length === 0) {
      toast({ title: "No stroke data", description: "Draw something before exporting a recording." });
      return;
    }

    const blob = new Blob([exportPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `still-hand-recording-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Recording downloaded", description: "The stroke payload has been saved as JSON." });
  };

  return (
    <div className={`h-[100dvh] w-full flex overflow-hidden bg-background font-sans ${appSettings.uiScale > 1 ? 'text-lg' : 'text-base'}`}>
      <Sidebar />

      <main className="flex-1 flex flex-col p-6 md:p-8 overflow-hidden">
        <div className="max-w-6xl w-full mx-auto flex flex-col gap-6 h-full">
          <header className="border-b border-border pb-6">
            <h1 className="text-4xl font-serif text-foreground mb-2">Stroke Recording</h1>
            <p className="text-muted-foreground text-lg">
              Export the live stroke data as a structured JSON payload for replay, analysis, or downstream tooling.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Stroke count</p>
              <p className="text-3xl font-serif mt-2">{strokes.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total points</p>
              <p className="text-3xl font-serif mt-2">{strokes.reduce((sum, stroke) => sum + stroke.points.length, 0)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Format</p>
              <p className="text-3xl font-serif mt-2">JSON</p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Tremor frequency</p>
            <p className="text-3xl font-serif mt-2">
              {strokes.length ? `${Math.max(...strokes.map((stroke) => stroke.tremorFrequencyHz ?? 0)).toFixed(2)} Hz` : "0.00 Hz"}
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCopy} disabled={strokes.length === 0}>Copy JSON</Button>
            <Button variant="outline" onClick={handleDownload} disabled={strokes.length === 0}>Download JSON</Button>
          </div>

          <div className="flex-1 min-h-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <Textarea
              readOnly
              value={exportPayload}
              className="h-full min-h-[420px] w-full resize-none rounded-none border-0 bg-transparent font-mono text-xs leading-6 text-foreground"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
