import React, { useState } from 'react';
import { Modal } from '../common/Modal.js';
import { useAppStore } from '../../store/useAppStore.js';
import { syncPlaylist } from '../../services/sync.js';
import { CatalogDb } from '../../services/db.js';
import {
  Trash2,
  RefreshCw,
  Shield,
  Download,
  Upload,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    activeProfile,
    loadProfiles,
    setActiveProfile,
    favorites,
    clearHistory,
  } = useAppStore();

  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncSuccess, setResyncSuccess] = useState(false);
  const [passwordInput, setPasswordInput] = useState(settings.appPassword || '');

  const handleResync = async () => {
    if (!activeProfile) return;
    setIsResyncing(true);
    setResyncSuccess(false);

    try {
      await syncPlaylist(activeProfile.url, activeProfile.name, settings.appPassword);
      await loadProfiles();
      setIsResyncing(false);
      setResyncSuccess(true);
      setTimeout(() => setResyncSuccess(false), 3000);
    } catch (err) {
      console.error('Re-sync failed:', err);
      setIsResyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Purge all cached catalogs and profiles from local IndexedDB?')) {
      await CatalogDb.clearAllData();
      clearHistory();
      await loadProfiles();
      await setActiveProfile(null);
      onClose();
    }
  };

  const handleExportFavorites = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(favorites, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'senku_favorites.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFavorites = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const merged = Array.from(new Set([...favorites, ...imported.map(String)]));
          localStorage.setItem('senku_favorites_v1', JSON.stringify(merged));
          useAppStore.setState({ favorites: merged });
          alert(`Successfully synthesized ${imported.length} favorites.`);
        }
      } catch {
        alert('Invalid JSON favorites file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="TERMINAL SETTINGS" badgeText="CONFIG">
      <div className="space-y-6 font-mono text-xs">
        {/* Profile Maintenance */}
        <div className="space-y-3 pb-4 border-b border-borderDim">
          <div className="flex items-center gap-2 text-cyanNeon uppercase tracking-wider font-semibold">
            <Layers size={13} />
            <span>Active Sector Telemetry</span>
          </div>

          {activeProfile ? (
            <div className="p-3 bg-surfaceLight/40 border border-borderDim rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-textBright font-bold">{activeProfile.name}</span>
                <span className="text-[10px] text-portal uppercase">
                  TYPE: {activeProfile.type}
                </span>
              </div>
              <div className="text-[11px] text-textMuted truncate">
                HOST: {activeProfile.baseUrl}
              </div>
              <div className="text-[11px] text-textMuted">
                LAST SYNCED: {new Date(activeProfile.lastSynced).toLocaleString()}
              </div>

              {/* Masked Password */}
              <div className="text-[11px] text-textDim flex items-center gap-2">
                <span>USER: {activeProfile.username}</span>
                <span>•</span>
                <span>PASS: ••••••••</span>
              </div>

              <button
                onClick={handleResync}
                disabled={isResyncing}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-cyanNeon/15 hover:bg-cyanNeon/25 text-cyanNeon border border-cyanNeon/40 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw size={13} className={isResyncing ? 'animate-spin' : ''} />
                <span>{isResyncing ? 'RE-SYNCHRONIZING...' : 'RE-SYNC CATALOG'}</span>
              </button>

              {resyncSuccess && (
                <div className="text-center text-portal text-[11px] flex items-center justify-center gap-1.5 mt-1">
                  <CheckCircle2 size={12} />
                  <span>Sector catalog successfully refreshed!</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-textDim text-center py-2">No active profile selected.</div>
          )}
        </div>

        {/* Content Filters & Player Settings */}
        <div className="space-y-3 pb-4 border-b border-borderDim">
          <div className="flex items-center gap-2 text-cyanNeon uppercase tracking-wider font-semibold">
            <Shield size={13} />
            <span>Filters & Engine Parameters</span>
          </div>

          {/* Hide Adult Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-surfaceLight/30 border border-borderDim rounded-lg">
            <div>
              <div className="font-semibold text-textBright">Hide Adult Content</div>
              <div className="text-[10px] text-textDim">Filter out XXX/18+ categories automatically</div>
            </div>
            <button
              onClick={() => updateSettings({ hideAdult: !settings.hideAdult })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.hideAdult ? 'bg-portal justify-end' : 'bg-surfaceLight justify-start border border-borderDim'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-void shadow-md" />
            </button>
          </div>

          {/* Preferred Stream Format */}
          <div className="flex items-center justify-between p-2.5 bg-surfaceLight/30 border border-borderDim rounded-lg">
            <div>
              <div className="font-semibold text-textBright">Live Stream Format</div>
              <div className="text-[10px] text-textDim">Default container requested from Xtream node</div>
            </div>
            <select
              value={settings.preferredStreamFormat}
              onChange={(e) =>
                updateSettings({ preferredStreamFormat: e.target.value as 'm3u8' | 'ts' })
              }
              className="bg-void border border-borderDim text-textBright text-xs rounded px-2.5 py-1 focus:outline-none focus:border-cyanNeon"
            >
              <option value="m3u8">HLS (.m3u8)</option>
              <option value="ts">MPEG-TS (.ts)</option>
            </select>
          </div>

          {/* Gateway APP_PASSWORD */}
          <div className="p-2.5 bg-surfaceLight/30 border border-borderDim rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-textBright font-semibold">
              <Lock size={12} className="text-amberNeon" />
              <span>Proxy Gateway Access Key (APP_PASSWORD)</span>
            </div>
            <div className="text-[10px] text-textDim">
              Required if your backend was launched with APP_PASSWORD environment variable.
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter single-user app key..."
                className="flex-1 px-3 py-1.5 bg-void border border-borderDim focus:border-cyanNeon rounded text-textBright focus:outline-none text-xs"
              />
              <button
                onClick={() => {
                  updateSettings({ appPassword: passwordInput.trim() });
                  alert('Gateway key updated.');
                }}
                className="px-3 py-1.5 bg-surfaceLight hover:bg-borderDim text-textBright rounded border border-borderDim transition-colors text-xs"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>

        {/* Favorites Import / Export */}
        <div className="space-y-3 pb-4 border-b border-borderDim">
          <div className="text-cyanNeon uppercase tracking-wider font-semibold">
            Data Portability
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportFavorites}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-surfaceLight hover:bg-borderDim border border-borderDim rounded-lg text-textBright transition-colors"
            >
              <Download size={13} />
              <span>EXPORT FAVORITES</span>
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-surfaceLight hover:bg-borderDim border border-borderDim rounded-lg text-textBright transition-colors cursor-pointer">
              <Upload size={13} />
              <span>IMPORT FAVORITES</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFavorites}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-1.5 text-dangerNeon uppercase tracking-wider font-semibold">
            <AlertTriangle size={13} />
            <span>Danger Zone</span>
          </div>
          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center gap-2 py-2 bg-dangerNeon/10 hover:bg-dangerNeon/20 text-dangerNeon border border-dangerNeon/40 rounded-lg transition-colors font-bold"
          >
            <Trash2 size={13} />
            <span>PURGE ALL LOCAL STORAGE & INDEXEDDB</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
