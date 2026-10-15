import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import {
  Tv,
  Film,
  Clapperboard,
  Settings,
  Plus,
  Radio,
  Cpu,
  Clock,
  ChevronDown,
  Trash2,
  Activity,
  Layers,
} from 'lucide-react';
import { StreamType } from '../../../../shared/types.js';

interface WaybarProps {
  onOpenOnboarding: () => void;
  onOpenSettings: () => void;
}

export const Waybar: React.FC<WaybarProps> = ({ onOpenOnboarding, onOpenSettings }) => {
  const {
    activeTab,
    setActiveTab,
    activeProfile,
    profiles,
    setActiveProfile,
    deleteProfile,
  } = useAppStore();

  const {
    currentMedia,
    currentResolution,
    currentBitrateMbps,
    bufferHealthSeconds,
  } = usePlayerStore();

  const [timeStr, setTimeStr] = useState<string>('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: StreamType; label: string; num: string; icon: React.ReactNode }[] = [
    { id: 'live', label: 'LIVE', num: '1', icon: <Tv size={13} /> },
    { id: 'movie', label: 'MOVIES', num: '2', icon: <Film size={13} /> },
    { id: 'series', label: 'SERIES', num: '3', icon: <Clapperboard size={13} /> },
  ];

  const userInfo = activeProfile?.userInfo;
  const expDateStr = userInfo?.exp_date
    ? new Date(Number(userInfo.exp_date) * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <header className="h-10 px-3 bg-surface/90 border-b border-borderDim flex items-center justify-between text-xs font-mono select-none z-30 shrink-0 gap-2">
      {/* Left: System Identifier & Workspace Tabs */}
      <div className="flex items-center gap-2">
        {/* Senku Kernel Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surfaceLight border border-borderDim rounded-md text-textBright">
          <span className="w-2 h-2 rounded-full bg-portal animate-pulse-glow" />
          <span className="font-bold tracking-widest text-portal">SENKU</span>
          <span className="text-textDim">::</span>
          <span className="text-[11px] text-cyanNeon">ARCH_v1</span>
        </div>

        {/* Hyprland-style Workspace Pills */}
        <div className="flex items-center bg-void/80 p-0.5 rounded-md border border-borderDim">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-portal/20 text-portal border border-portal/40 shadow-portal-glow font-semibold'
                    : 'text-textMuted hover:text-textBright hover:bg-surfaceLight/60'
                }`}
              >
                <span className="text-[10px] opacity-75 font-bold">[{tab.num}]</span>
                {tab.icon}
                <span className="tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Profile / Account Capsule */}
      <div className="relative">
        <div
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1 bg-surfaceLight border border-borderDim hover:border-cyanNeon/40 rounded-md cursor-pointer transition-all"
        >
          <Layers size={13} className="text-cyanNeon" />
          <span className="text-textBright font-medium max-w-[150px] truncate">
            {activeProfile?.name || 'NO_PROFILE_LOADED'}
          </span>

          {userInfo && (
            <>
              <span className="text-borderDim">|</span>
              <span className="text-[10px] text-portal">
                CONN: {userInfo.active_cons || 0}/{userInfo.max_connections || 1}
              </span>
              {expDateStr && (
                <>
                  <span className="text-borderDim">|</span>
                  <span className="text-[10px] text-amberNeon">EXP: {expDateStr}</span>
                </>
              )}
            </>
          )}

          <ChevronDown size={12} className="text-textMuted ml-1" />
        </div>

        {/* Dropdown Menu */}
        {profileDropdownOpen && (
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-64 bg-surface border border-borderDim rounded-lg shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="text-[10px] text-textMuted tracking-wider uppercase px-2 py-1 border-b border-borderDim/50 mb-1">
              Active Coordinates
            </div>

            {profiles.length === 0 ? (
              <div className="px-2 py-3 text-center text-textMuted text-xs">
                Null set. No profiles synthesized.
              </div>
            ) : (
              profiles.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group ${
                    p.id === activeProfile?.id
                      ? 'bg-portal/15 text-portal border border-portal/30'
                      : 'hover:bg-surfaceLight text-textBright'
                  }`}
                  onClick={() => {
                    setActiveProfile(p);
                    setProfileDropdownOpen(false);
                  }}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-xs font-medium truncate">{p.name}</span>
                    <span className="text-[10px] text-textMuted">
                      {p.type.toUpperCase()} • {new Date(p.lastSynced).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(p.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-dangerNeon transition-opacity"
                    title="Purge profile"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}

            <button
              onClick={() => {
                setProfileDropdownOpen(false);
                onOpenOnboarding();
              }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-cyanNeon/10 hover:bg-cyanNeon/20 text-cyanNeon border border-cyanNeon/30 rounded text-xs transition-colors"
            >
              <Plus size={12} />
              <span>SYNTHESIZE NEW</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Real-time Telemetry, Clock & Settings */}
      <div className="flex items-center gap-2">
        {/* Video Telemetry when active */}
        {currentMedia && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-void/80 border border-borderDim rounded-md text-[11px]">
            <Activity size={12} className="text-portal animate-pulse" />
            <span className="text-portal font-semibold">[{currentResolution}]</span>
            <span className="text-textDim">/</span>
            <span className="text-cyanNeon">{currentBitrateMbps.toFixed(1)} Mbps</span>
            <span className="text-textDim">/</span>
            <span className="text-amberNeon">{bufferHealthSeconds.toFixed(0)}s BUF</span>
          </div>
        )}

        {/* Digital Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surfaceLight border border-borderDim rounded-md text-textBright">
          <Clock size={12} className="text-cyanNeon" />
          <span className="tabular-nums font-semibold">{timeStr || '00:00:00'}</span>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 bg-surfaceLight border border-borderDim hover:border-cyanNeon/50 hover:text-cyanNeon rounded-md text-textMuted transition-colors"
          title="Terminal Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
