import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import { Terminal, X, Minimize2 } from 'lucide-react';

export const KittyOverlay: React.FC = () => {
  const {
    currentMedia,
    currentResolution,
    currentBitrateMbps,
    bufferHealthSeconds,
    showTerminalOverlay,
    toggleTerminalOverlay,
    terminalLogs,
  } = usePlayerStore();

  if (!showTerminalOverlay || !currentMedia) return null;

  return (
    <div className="absolute top-4 left-4 z-40 max-w-lg w-full bg-void/90 border border-borderDim rounded-lg shadow-2xl backdrop-blur-md overflow-hidden font-mono text-xs select-none transition-all duration-150 animate-in fade-in slide-in-from-top-3">
      {/* Kitty Terminal Titlebar */}
      <div className="h-7 px-3 bg-surfaceLight/80 border-b border-borderDim flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Kitty Window Action Dots */}
          <div className="flex items-center gap-1.5">
            <span
              onClick={toggleTerminalOverlay}
              className="w-2.5 h-2.5 rounded-full bg-dangerNeon/80 hover:bg-dangerNeon cursor-pointer transition-colors"
              title="Close terminal overlay"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-amberNeon/80 hover:bg-amberNeon cursor-pointer transition-colors" />
            <span className="w-2.5 h-2.5 rounded-full bg-portal/80 hover:bg-portal cursor-pointer transition-colors" />
          </div>
          <span className="text-[11px] text-textMuted tracking-wider ml-1">
            kitty ~ senku@iptv
          </span>
        </div>

        <div className="text-[10px] text-cyanNeon">
          [ {currentResolution} · {currentBitrateMbps.toFixed(1)} Mbps · {bufferHealthSeconds.toFixed(0)}s BUF ]
        </div>
      </div>

      {/* Terminal Shell Body */}
      <div className="p-3 text-[11px] leading-relaxed space-y-1.5 bg-void/95">
        {/* Main Kitty Prompt Line */}
        <div className="flex flex-wrap items-center gap-1 text-portal">
          <span className="text-cyanNeon font-bold">❯</span>
          <span className="text-portal font-semibold">senku@iptv</span>
          <span className="text-textDim">~</span>
          <span className="text-textBright">$</span>
          <span className="text-amberNeon ml-1">playing</span>
          <span className="text-cyanNeon">"{currentMedia.name}"</span>
          <span className="text-textMuted">
            [{currentResolution} · {currentBitrateMbps.toFixed(1)} Mbps]
          </span>
        </div>

        {/* Live / VOD metadata status line */}
        <div className="text-textMuted text-[10px] pl-3 border-l-2 border-portal/40 space-y-0.5">
          <div>
            <span className="text-textDim">STREAM TYPE:</span>{' '}
            <span className="text-portal uppercase">{currentMedia.type}</span>
            {currentMedia.subtitle && (
              <span className="text-cyanNeon ml-2">({currentMedia.subtitle})</span>
            )}
          </div>
          <div>
            <span className="text-textDim">SIGNAL STATUS:</span>{' '}
            <span className="text-portal">LOCKED</span>
          </div>
        </div>

        {/* Recent logs */}
        <div className="pt-1 border-t border-borderDim/40 max-h-24 overflow-y-auto space-y-0.5 text-[10px] text-textDim">
          {terminalLogs.slice(-4).map((log, idx) => (
            <div key={idx} className="font-mono truncate">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
