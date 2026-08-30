import { memo } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Activity, 
  Video, 
  Mic2, 
  Zap, 
  Settings,
  Clock,
  BookOpen,
  Network
} from 'lucide-react';

interface FooterProps {
  activeScreen: string;
  onScreenChange: (id: string) => void;
}

const SCREENS = [
  { id: 'command', label: 'CMD', icon: LayoutDashboard },
  { id: 'sensors', label: 'SENSORS', icon: Activity },
  { id: 'feeds', label: 'FEEDS', icon: Video },
  { id: 'evp', label: 'EVP', icon: Mic2 },
  { id: 'temporal', label: 'TEMPLE', icon: Clock },
  { id: 'neural', label: 'CHAT', icon: Zap },
  { id: 'journal', label: 'JOURNAL', icon: BookOpen },
  { id: 'lattice', label: 'LATTICE', icon: Network },
  { id: 'config', label: 'CONFIG', icon: Settings },
];

// Memoized to avoid re-rendering on high-frequency telemetry updates
function Footer({ activeScreen, onScreenChange }: FooterProps) {
  return (
    <footer className="relative flex items-center justify-center gap-1.5 h-[72px] px-4 bg-[#060614]/98 border-t border-border-subtle z-20 overflow-x-auto">
      <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-neon-violet via-neon-blue to-neon-violet to-transparent opacity-60" />
      
      {SCREENS.map(screen => (
        <button
          key={screen.id}
          onClick={() => onScreenChange(screen.id)}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[62px] py-1.5 px-2 bg-none border border-border-subtle rounded-[4px] cursor-pointer font-bold text-[10px] text-text-dim tracking-[1px] transition-all hover:border-neon-violet hover:text-text-bright hover:bg-neon-violet/10 hover:shadow-[0_0_8px_rgba(155,48,255,0.2)] shrink-0",
            activeScreen === screen.id && "border-neon-blue text-neon-blue bg-neon-blue/8 shadow-[0_0_10px_rgba(0,212,255,0.2)]"
          )}
        >
          <screen.icon size={18} />
          <span>{screen.label}</span>
        </button>
      ))}
    </footer>
  );
}

export default memo(Footer);
