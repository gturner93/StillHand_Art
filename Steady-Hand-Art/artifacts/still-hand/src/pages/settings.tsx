import Sidebar from "@/components/Sidebar";
import { useStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function Settings() {
  const { appSettings, setAppSettings } = useStore();
  
  return (
    <div className={`h-[100dvh] w-full flex overflow-hidden bg-background font-sans ${appSettings.uiScale > 1 ? 'text-lg' : 'text-base'}`}>
      <Sidebar />
      
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto">
          <header className="mb-12 border-b border-border pb-6">
            <h1 className="text-4xl font-serif text-foreground mb-4">Studio Preferences</h1>
            <p className="text-muted-foreground text-lg">Customize the environment to suit your comfort and needs.</p>
          </header>

          <div className="space-y-12">
            
            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6">Interaction</h2>
              
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
                <div className="max-w-[70%]">
                  <Label htmlFor="large-targets" className="text-lg font-medium block mb-2">Large Touch Targets</Label>
                  <p className="text-muted-foreground">Increases the size of all buttons and controls, making them easier to tap comfortably.</p>
                </div>
                <Switch 
                  id="large-targets" 
                  checked={appSettings.largeTouchTargets} 
                  onCheckedChange={(checked) => setAppSettings({ largeTouchTargets: checked })}
                  className="scale-125"
                />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6">Visibility</h2>
              
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-8">
                
                <div className="flex items-center justify-between">
                  <div className="max-w-[70%]">
                    <Label htmlFor="high-contrast" className="text-lg font-medium block mb-2">High Contrast Mode</Label>
                    <p className="text-muted-foreground">Switches to a darker theme with higher contrast between background and text/controls.</p>
                  </div>
                  <Switch 
                    id="high-contrast" 
                    checked={appSettings.highContrast} 
                    onCheckedChange={(checked) => setAppSettings({ highContrast: checked })}
                    className="scale-125"
                  />
                </div>

                <div className="border-t border-border pt-8">
                  <div className="mb-4">
                    <Label className="text-lg font-medium block mb-2">Interface Text Size</Label>
                    <p className="text-muted-foreground">Scale up the text across the entire application.</p>
                  </div>
                  <div className="px-2">
                    <Slider 
                      value={[appSettings.uiScale]} 
                      onValueChange={(val) => setAppSettings({ uiScale: val[0] })}
                      max={1.5}
                      min={1}
                      step={0.1}
                    />
                    <div className="flex justify-between mt-3 text-sm text-muted-foreground font-medium">
                      <span>Standard</span>
                      <span>Large</span>
                      <span>Extra Large</span>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-foreground mb-6">Comfort</h2>
              
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
                <div className="max-w-[70%]">
                  <Label htmlFor="reduced-motion" className="text-lg font-medium block mb-2">Reduced Motion</Label>
                  <p className="text-muted-foreground">Minimizes animations and transitions throughout the app to prevent discomfort or distraction.</p>
                </div>
                <Switch 
                  id="reduced-motion" 
                  checked={appSettings.reducedMotion} 
                  onCheckedChange={(checked) => setAppSettings({ reducedMotion: checked })}
                  className="scale-125"
                />
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
