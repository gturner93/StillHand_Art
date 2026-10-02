import Sidebar from "@/components/Sidebar";
import ControlPanel from "@/components/ControlPanel";
import Canvas from "@/components/Canvas";
import { useStore } from "@/lib/store";

export default function Home() {
  const { appSettings } = useStore();
  
  return (
    <div className={`h-[100dvh] w-full flex overflow-hidden bg-background font-sans ${appSettings.uiScale > 1 ? 'text-lg' : 'text-base'}`}>
      <Sidebar />
      
      <main className="flex-1 flex p-4 md:p-8 overflow-hidden">
        <Canvas />
      </main>

      <ControlPanel />
    </div>
  );
}
