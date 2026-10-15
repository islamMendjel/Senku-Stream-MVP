import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { syncPlaylist } from '../../services/sync.js';
import { SyncProgressUpdate } from '../../../../shared/types.js';
import { Zap, Radio, AlertTriangle, Shield, CheckCircle2, Terminal } from 'lucide-react';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ isOpen, onClose }) => {
  const { setActiveProfile, loadProfiles, settings } = useAppStore();

  const [url, setUrl] = useState('');
  const [profileName, setProfileName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgressUpdate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSyncing(true);
    setErrorMsg(null);
    setProgress({ phase: 'init', message: 'Synthesizing dimensional coordinates...' });

    try {
      const profile = await syncPlaylist(
        url.trim(),
        profileName.trim() || undefined,
        settings.appPassword,
        (update) => setProgress(update)
      );

      await loadProfiles();
      await setActiveProfile(profile);
      setIsSyncing(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface border border-borderDim rounded-xl shadow-2xl p-6 hypr-active-border relative">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-borderDim mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-portal animate-pulse-glow" />
            <h1 className="text-base font-mono font-bold tracking-widest text-textBright">
              [ DIMENSIONAL SYNTHESIS ]
            </h1>
          </div>
          <span className="text-xs font-mono text-cyanNeon bg-cyanNeon/10 border border-cyanNeon/30 px-2.5 py-0.5 rounded">
            XTREAM // M3U GATEWAY
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSync} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-textMuted uppercase tracking-wider mb-1.5">
              Playlist Coordinate URL (Xtream or M3U)
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://host:8080/get.php?username=U&password=P&type=m3u_plus&output=m3u8"
                disabled={isSyncing}
                className="w-full px-3.5 py-2.5 bg-surfaceLight border border-borderDim focus:border-cyanNeon rounded-lg text-textBright text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyanNeon/50 transition-all placeholder:text-textDim"
                autoFocus
              />
            </div>
            <p className="mt-1.5 text-[11px] font-mono text-textDim">
              Paste an M3U plus URL or Xtream Codes endpoint. Gateway probes Xtream API first, then falls back to chunked M3U worker stream.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-textMuted uppercase tracking-wider mb-1.5">
              Profile Alias (Optional)
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Primary Portal"
              disabled={isSyncing}
              className="w-full px-3.5 py-2 bg-surfaceLight border border-borderDim focus:border-cyanNeon rounded-lg text-textBright text-xs font-mono focus:outline-none transition-all placeholder:text-textDim"
            />
          </div>

          {/* Sync Progress Readout */}
          {isSyncing && progress && (
            <div className="p-3.5 bg-void border border-borderDim rounded-lg font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-portal">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-portal animate-ping" />
                  <span className="font-semibold tracking-wider uppercase">
                    {progress.phase.replace('_', ' ')}
                  </span>
                </span>
                <span className="text-cyanNeon text-[11px] animate-pulse">
                  Telemetry incoming...
                </span>
              </div>
              <div className="text-textBright text-[11px] font-mono bg-surface p-2 rounded border border-borderDim/50">
                ❯ {progress.message}
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-surfaceLight rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-portal to-cyanNeon animate-pulse" />
              </div>
            </div>
          )}

          {/* Error Readout */}
          {errorMsg && (
            <div className="p-3.5 bg-dangerNeon/10 border border-dangerNeon/40 rounded-lg text-dangerNeon font-mono text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold tracking-wide uppercase">
                  Dimension breach: Synthesis Failure
                </div>
                <div className="text-[11px] mt-1 text-dangerNeon/90">{errorMsg}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderDim">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="px-4 py-2 text-xs font-mono text-textMuted hover:text-textBright hover:bg-surfaceLight rounded-lg transition-colors"
            >
              [ ABORT ]
            </button>
            <button
              type="submit"
              disabled={isSyncing || !url.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-portal/20 hover:bg-portal/30 text-portal border border-portal/50 rounded-lg text-xs font-mono font-bold tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-portal-glow"
            >
              <Zap size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'SYNTHESIZING...' : 'SYNTHESIS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
