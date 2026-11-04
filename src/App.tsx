import { useState } from 'react';
import { DesktopDashboard } from './components/DesktopDashboard';
import { MobileView } from './components/MobileView';
import { Laptop } from 'lucide-react';

export function App() {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const isMobileDevice = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    if (isTauri) return 'desktop';
    if (isMobileDevice) return 'mobile';
    return 'desktop';
  });

  // If opened on an actual mobile device (e.g. Safari on iPhone), always show MobileView with NO buttons to switch
  if (isMobileDevice) {
    return <MobileView />;
  }

  // On PC: in native Tauri desktop app allow switching to phone view for preview/testing and back
  return (
    <div className="h-screen w-screen overflow-hidden">
      {viewMode === 'desktop' ? (
        <DesktopDashboard onSwitchToMobile={isTauri ? () => setViewMode('mobile') : undefined} />
      ) : (
        <div className="h-full w-full bg-zinc-950 flex flex-col items-center overflow-y-auto">
          {/* Top Bar on PC in Mobile Preview Mode */}
          <div className="w-full bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between z-30 sticky top-0 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="font-semibold text-zinc-100">Предпросмотр: вид телефон</span>
              <span className="text-zinc-500 hidden sm:inline">— так приложение выглядит на смартфоне в браузере</span>
            </div>

            <button
              onClick={() => setViewMode('desktop')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer shadow-sm"
              title="Вернуться к интерфейсу ПК"
            >
              <Laptop className="w-4 h-4" />
              <span>Вернуться к виду ПК</span>
            </button>
          </div>

          {/* Centered phone frame preview */}
          <div className="w-full max-w-md flex-1 shadow-2xl border-x border-zinc-800/80 bg-zinc-950">
            <MobileView />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
