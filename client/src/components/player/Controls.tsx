import React, { useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Terminal,
  Subtitles,
  AudioWaveform,
  Gauge,
  Tv,
} from 'lucide-react';
import { Badge } from '../common/Badge.js';

interface ControlsProps {
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onPreviousChannel?: () => void;
  onNextChannel?: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  onSeek,
  onVolumeChange,
  onPreviousChannel,
  onNextChannel,
}) => {
  const {
    currentMedia,
    isPlaying,
    setIsPlaying,
    volume,
    isMuted,
    toggleMute,
    currentTime,
    duration,
    playbackRate,
    setPlaybackRate,
    isFullscreen,
    toggleFullscreen,
    togglePiP,
    qualities,
    selectedQualityIndex,
    setSelectedQuality,
    audioTracks,
    selectedAudioTrackIndex,
    setSelectedAudioTrack,
    subtitleTracks,
    selectedSubtitleTrackIndex,
    setSelectedSubtitleTrack,
    showTerminalOverlay,
    toggleTerminalOverlay,
  } = usePlayerStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'main' | 'quality' | 'audio' | 'subs' | 'speed'>('main');

  const isLive = currentMedia?.type === 'live';

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-void via-void/80 to-transparent p-4 flex flex-col gap-2 font-mono text-xs select-none transition-opacity duration-300">
      {/* Progress / Seek Bar (for VOD & Series) */}
      {!isLive && duration > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-textMuted tabular-nums">
            {formatTime(currentTime)}
          </span>

          <div
            className="flex-1 h-1.5 bg-surfaceLight hover:h-2.5 rounded-full cursor-pointer relative group transition-all"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              onSeek(clickPos * duration);
            }}
          >
            {/* Filled progress */}
            <div
              className="h-full bg-portal rounded-full relative group-hover:bg-cyanNeon transition-colors"
              style={{ width: `${progressPct}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-textBright opacity-0 group-hover:opacity-100 shadow-portal-glow transition-opacity" />
            </div>
          </div>

          <span className="text-[11px] text-textMuted tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Main Control Bar */}
      <div className="flex items-center justify-between">
        {/* Left: Playback & Volume */}
        <div className="flex items-center gap-3">
          {/* Live Channels Navigation */}
          {isLive && onPreviousChannel && onNextChannel && (
            <div className="flex items-center gap-1 bg-surfaceLight/60 p-0.5 rounded-lg border border-borderDim">
              <button
                onClick={onPreviousChannel}
                className="p-1 hover:text-cyanNeon transition-colors"
                title="Previous Channel [P]"
              >
                <SkipBack size={14} />
              </button>
              <button
                onClick={onNextChannel}
                className="p-1 hover:text-cyanNeon transition-colors"
                title="Next Channel [N]"
              >
                <SkipForward size={14} />
              </button>
            </div>
          )}

          {/* 10s Rewind for VOD */}
          {!isLive && (
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 10))}
              className="p-1.5 text-textMuted hover:text-textBright transition-colors"
              title="Rewind 10s [Left Arrow]"
            >
              <RotateCcw size={15} />
            </button>
          )}

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-lg bg-portal/20 hover:bg-portal/30 text-portal border border-portal/50 flex items-center justify-center transition-all shadow-portal-glow"
            title="Play/Pause [Space]"
          >
            {isPlaying ? (
              <Pause size={17} className="fill-portal" />
            ) : (
              <Play size={17} className="fill-portal ml-0.5" />
            )}
          </button>

          {/* 10s Forward for VOD */}
          {!isLive && (
            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 10))}
              className="p-1.5 text-textMuted hover:text-textBright transition-colors"
              title="Forward 10s [Right Arrow]"
            >
              <RotateCw size={15} />
            </button>
          )}

          {/* Volume Group */}
          <div className="flex items-center gap-2 group/vol">
            <button
              onClick={toggleMute}
              className="p-1.5 text-textMuted hover:text-textBright transition-colors"
              title="Toggle Mute [M]"
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-surfaceLight accent-portal rounded-lg cursor-pointer transition-all"
            />
          </div>

          {/* Live Indicator */}
          {isLive && (
            <Badge variant="portal" size="md" pulse>
              LIVE
            </Badge>
          )}
        </div>

        {/* Center: Title / Metadata snippet */}
        <div className="hidden md:flex flex-col items-center max-w-sm truncate text-center">
          <span className="text-xs font-semibold text-textBright truncate w-full">
            {currentMedia?.name}
          </span>
          {currentMedia?.subtitle && (
            <span className="text-[10px] text-textMuted truncate">
              {currentMedia.subtitle}
            </span>
          )}
        </div>

        {/* Right: Telemetry, Quality, PiP, Fullscreen */}
        <div className="flex items-center gap-2 relative">
          {/* Kitty Terminal Overlay Toggle */}
          <button
            onClick={toggleTerminalOverlay}
            className={`p-1.5 rounded-lg border transition-all ${
              showTerminalOverlay
                ? 'bg-portal/20 text-portal border-portal/40 shadow-portal-glow'
                : 'bg-surfaceLight/60 text-textMuted border-borderDim hover:text-textBright'
            }`}
            title="Toggle Kitty Terminal Overlay [~]"
          >
            <Terminal size={15} />
          </button>

          {/* Quality / Audio / Settings Gear */}
          <button
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setActiveMenu('main');
            }}
            className={`p-1.5 rounded-lg border transition-all ${
              settingsOpen
                ? 'bg-cyanNeon/20 text-cyanNeon border-cyanNeon/40'
                : 'bg-surfaceLight/60 text-textMuted border-borderDim hover:text-textBright'
            }`}
            title="Stream Options"
          >
            <Settings size={15} />
          </button>

          {/* Picture in Picture */}
          <button
            onClick={togglePiP}
            className="p-1.5 bg-surfaceLight/60 text-textMuted hover:text-textBright border border-borderDim rounded-lg transition-colors"
            title="Picture in Picture"
          >
            <PictureInPicture2 size={15} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-surfaceLight/60 text-textMuted hover:text-textBright border border-borderDim rounded-lg transition-colors"
            title="Toggle Fullscreen [F]"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>

          {/* Settings Popup Menu */}
          {settingsOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-56 bg-surface/95 border border-borderDim rounded-xl shadow-2xl p-2 z-50 backdrop-blur-md animate-in fade-in zoom-in-95">
              {activeMenu === 'main' && (
                <div className="space-y-1">
                  <div className="text-[10px] text-textMuted uppercase tracking-wider px-2 py-1 border-b border-borderDim/50">
                    Stream Parameters
                  </div>

                  {/* Quality Item */}
                  <button
                    onClick={() => setActiveMenu('quality')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-surfaceLight text-textBright text-xs"
                  >
                    <span>Quality</span>
                    <span className="text-cyanNeon">
                      {selectedQualityIndex === -1 ? 'Auto' : qualities[selectedQualityIndex]?.label || 'Auto'}
                    </span>
                  </button>

                  {/* Audio Item */}
                  {audioTracks.length > 0 && (
                    <button
                      onClick={() => setActiveMenu('audio')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-surfaceLight text-textBright text-xs"
                    >
                      <span>Audio Track</span>
                      <span className="text-cyanNeon">
                        {audioTracks[selectedAudioTrackIndex]?.name || 'Default'}
                      </span>
                    </button>
                  )}

                  {/* Subtitles Item */}
                  {subtitleTracks.length > 0 && (
                    <button
                      onClick={() => setActiveMenu('subs')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-surfaceLight text-textBright text-xs"
                    >
                      <span>Subtitles</span>
                      <span className="text-cyanNeon">
                        {selectedSubtitleTrackIndex === -1 ? 'Off' : subtitleTracks[selectedSubtitleTrackIndex]?.name}
                      </span>
                    </button>
                  )}

                  {/* Speed Item (VOD only) */}
                  {!isLive && (
                    <button
                      onClick={() => setActiveMenu('speed')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-surfaceLight text-textBright text-xs"
                    >
                      <span>Speed</span>
                      <span className="text-cyanNeon">{playbackRate}x</span>
                    </button>
                  )}
                </div>
              )}

              {/* Quality Submenu */}
              {activeMenu === 'quality' && (
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveMenu('main')}
                    className="text-[10px] text-cyanNeon px-2 py-1 hover:underline mb-1 block"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      setSelectedQuality(-1);
                      setSettingsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                      selectedQualityIndex === -1 ? 'text-portal font-bold bg-portal/10' : 'text-textBright'
                    }`}
                  >
                    Auto (Adaptive HLS)
                  </button>
                  {qualities.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setSelectedQuality(q.id);
                        setSettingsOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                        selectedQualityIndex === q.id ? 'text-portal font-bold bg-portal/10' : 'text-textBright'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Speed Submenu */}
              {activeMenu === 'speed' && (
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveMenu('main')}
                    className="text-[10px] text-cyanNeon px-2 py-1 hover:underline mb-1 block"
                  >
                    ← Back
                  </button>
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setSettingsOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                        playbackRate === rate ? 'text-portal font-bold bg-portal/10' : 'text-textBright'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
