import { useState, useEffect, lazy, Suspense } from 'react';
import Starfield from '@/components/Starfield';
import SmokeBackground from '@/components/SmokeBackground';
import CornerSigils from '@/components/CornerSigils';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

// Transitioning to standard React Lazy Loading to decouple from Next.js server constraints
const ScreenCommand = lazy(() => import('@/components/ScreenCommand'));
const ScreenSensors = lazy(() => import('@/components/ScreenSensors'));
const ScreenFeeds = lazy(() => import('@/components/ScreenFeeds'));
const ScreenEVP = lazy(() => import('@/components/ScreenEVP'));
const ScreenNeural = lazy(() => import('@/components/ScreenNeural'));
const ScreenTemporal = lazy(() => import('@/components/ScreenTemporal'));
const ScreenConfig = lazy(() => import('@/components/ScreenConfig'));

import { useNexusState } from '@/hooks/use-nexus-state';

function ScreenLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-neon-violet animate-spin opacity-50" />
        <div className="font-mono text-[10px] tracking-[4px] text-neon-violet animate-pulse">
            SYNTHESIZING_LAYER_DATA...
        </div>
      </div>
    </div>
  );
}

export default function NexusPlatform() {
  const [activeScreen, setActiveScreen] = useState('neural');
  const [mounted, setMounted] = useState(false);
  const { anomalyLevel, llmStatus, setLlmStatus, meters, historiesRef } = useNexusState();

  // Ensure client-side only rendering to maintain React purity
  useEffect(() => {
    setMounted(true);
  }, []);

  const renderScreen = () => {
    if (!mounted) return <ScreenLoader />;
    
    return (
      <Suspense fallback={<ScreenLoader />}>
        {(() => {
          switch (activeScreen) {
            case 'command': return <ScreenCommand meters={meters} />;
            case 'sensors': return <ScreenSensors externalHistoryRef={historiesRef} />;
            case 'feeds': return <ScreenFeeds />;
            case 'evp': return <ScreenEVP />;
            case 'temporal': return <ScreenTemporal />;
            case 'neural': return <ScreenNeural onStatusChange={setLlmStatus} />;
            case 'config': return <ScreenConfig />;
            default: return <ScreenCommand />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="relative font-rajdhani bg-void text-text-bright w-screen h-screen overflow-hidden flex flex-col">
      <Starfield />
      <SmokeBackground />
      <CornerSigils />
      
      <Header llmStatus={llmStatus} anomalyLevel={anomalyLevel} />
      
      <div className="flex-1 grid grid-cols-11 overflow-hidden">
        <Sidebar 
          activeScreen={activeScreen} 
          onScreenChange={setActiveScreen} 
          anomalyLevel={anomalyLevel}
        />
        
        <main className="col-span-8 relative overflow-hidden bg-void/40">
          <div className="absolute inset-0 p-4 overflow-y-auto">
            {renderScreen()}
          </div>
        </main>
      </div>
      
      <Footer activeScreen={activeScreen} onScreenChange={setActiveScreen} />
    </div>
  );
}
