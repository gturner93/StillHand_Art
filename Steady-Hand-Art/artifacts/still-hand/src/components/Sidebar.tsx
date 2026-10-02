import { Link, useLocation } from "wouter";
import { Pen, Image as ImageIcon, FileText, Settings as SettingsIcon, Undo, Redo, Trash2, Download, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { saveDrawing } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Drawing } from "@/lib/types";

export default function Sidebar() {
  const [location] = useLocation();
  const { strokes, undo, redo, canUndo, canRedo, clear, appSettings } = useStore();
  const { toast } = useToast();

  const buttonClass = appSettings.largeTouchTargets ? "h-14 w-14" : "h-12 w-12";
  const iconClass = appSettings.largeTouchTargets ? "h-6 w-6" : "h-5 w-5";

  const handleSave = async () => {
    if (strokes.length === 0) {
      toast({ title: "Nothing to save", description: "Draw something first before saving." });
      return;
    }

    try {
      const newDrawing: Drawing = {
        id: crypto.randomUUID(),
        name: `Drawing ${new Date().toLocaleDateString()}`,
        strokes,
        updatedAt: Date.now()
      };
      
      await saveDrawing(newDrawing);
      toast({ 
        title: "Saved to Gallery", 
        description: "Your drawing has been safely stored.",
        duration: 3000 
      });
    } catch (err) {
      toast({ 
        title: "Error saving", 
        description: "Could not save your drawing.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = () => {
    if (strokes.length === 0) {
      toast({ title: "Nothing to download", description: "Draw something first." });
      return;
    }
    
    // We'll draw on a temporary canvas to get a clean export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1920; 
    tempCanvas.height = 1080;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      import('@/lib/drawing').then(({ drawStroke }) => {
        strokes.forEach(stroke => {
          drawStroke(ctx, stroke.points, stroke.size, stroke.color, stroke.opacity, stroke.tool);
        });
        const url = tempCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `StillHand_${new Date().getTime()}.png`;
        a.click();
        toast({ title: "Downloaded successfully" });
      });
    }
  };

  const NavItem = ({ href, icon: Icon, label, isActive }: any) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href}>
          <div className={`
            flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-colors
            ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'}
            ${appSettings.largeTouchTargets ? 'min-h-[5rem]' : 'min-h-[4rem]'}
          `}>
            <Icon className={iconClass} />
            <span className="text-xs mt-1 font-medium">{label}</span>
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="w-24 md:w-32 bg-card border-r border-border h-full flex flex-col items-center py-6 gap-8 overflow-y-auto shrink-0 z-10 shadow-sm">
      <div className="flex flex-col items-center gap-1 mb-4">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground mb-2 shadow-sm">
          <Pen className="h-5 w-5" />
        </div>
        <span className="text-xs font-serif font-bold text-foreground text-center leading-tight px-1">Still Hand</span>
      </div>

      <div className="flex flex-col gap-4 w-full px-3">
        <NavItem href="/" icon={Pen} label="Studio" isActive={location === "/"} />
        <NavItem href="/gallery" icon={ImageIcon} label="Gallery" isActive={location === "/gallery"} />
        <NavItem href="/extract" icon={FileText} label="Extract" isActive={location === "/extract"} />
      </div>

      {location === "/" && (
        <div className="flex flex-col gap-4 w-full px-3 mt-auto pt-6 border-t border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className={`w-full flex-col gap-1 ${appSettings.largeTouchTargets ? 'h-16' : 'h-14'} text-muted-foreground hover:text-foreground`}
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo className={iconClass} />
                <span className="text-[10px]">Undo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Undo last stroke</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className={`w-full flex-col gap-1 ${appSettings.largeTouchTargets ? 'h-16' : 'h-14'} text-muted-foreground hover:text-foreground`}
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo className={iconClass} />
                <span className="text-[10px]">Redo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Redo stroke</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className={`w-full flex-col gap-1 ${appSettings.largeTouchTargets ? 'h-16' : 'h-14'} text-muted-foreground hover:text-destructive`}
                onClick={clear}
                disabled={strokes.length === 0}
              >
                <Trash2 className={iconClass} />
                <span className="text-[10px]">Clear</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Clear canvas</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="default" 
                className={`w-full flex-col gap-1 mt-2 ${appSettings.largeTouchTargets ? 'h-16' : 'h-14'} shadow-md`}
                onClick={handleSave}
              >
                <Save className={iconClass} />
                <span className="text-[10px]">Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Save to Gallery</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                className={`w-full flex-col gap-1 ${appSettings.largeTouchTargets ? 'h-16' : 'h-14'} shadow-sm border-primary/20 text-primary`}
                onClick={handleDownload}
              >
                <Download className={iconClass} />
                <span className="text-[10px]">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Download as PNG</p></TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className={`mt-${location === '/' ? '4' : 'auto'} w-full px-3`}>
        <NavItem href="/settings" icon={SettingsIcon} label="Settings" isActive={location === "/settings"} />
      </div>
    </div>
  );
}
