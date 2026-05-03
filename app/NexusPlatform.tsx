'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Starfield from '@/components/Starfield';
import SmokeBackground from '@/components/SmokeBackground';
import CornerSigils from '@/components/CornerSigils';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

// Dynamic imports for screens to avoid SSR issues
const ScreenCommand = dynamic(() => import('@/components/ScreenCommand'), { ssr: false });
const ScreenSensors = dynamic(() => import('@/components/ScreenSensors'), { ssr: false });
const ScreenFeeds = dynamic(() => import('@/components/ScreenFeeds'), { ssr: false });
const ScreenEVP = dynamic(() => import('@/components/ScreenEVP'), { ssr: false });
const ScreenNeural = dynamic(() => import('@/components/ScreenNeural'), { ssr: false });
const ScreenConfig = dynamic(() => import('@/components/ScreenConfig'), { ssr: false });

import { useNexusState } from '@/hooks/use-nexus-state';

export default function NexusPlatform() {
  const [activeScreen, setActiveScreen] = useState('neural');
  const { anomalyLevel, llmStatus, setLlmStatus, meters, historiesRef } = useNexusState();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'command': return <ScreenCommand meters={meters} />;
      case 'sensors': return <ScreenSensors externalHistoryRef={historiesRef} />;
      case 'feeds': return <ScreenFeeds />;
      case 'evp': return <ScreenEVP />;
      case 'neural': return <ScreenNeural onStatusChange={setLlmStatus} />;
      case 'config': return <ScreenConfig />;
      default: return <ScreenCommand />;
    }
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
