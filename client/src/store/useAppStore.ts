import { create } from 'zustand';
import {
  PlaylistProfile,
  Category,
  UserSettings,
  WatchHistoryItem,
  StreamType,
} from '../../../shared/types.js';
import { CatalogDb } from '../services/db.js';

interface AppState {
  // Profiles
  profiles: PlaylistProfile[];
  activeProfile: PlaylistProfile | null;
  isLoadingProfiles: boolean;

  // Navigation & Filtering
  activeTab: StreamType;
  selectedCategoryId: string; // 'all' or specific id
  searchQuery: string;

  // Data
  categories: Category[];
  isLoadingCategories: boolean;

  // Settings & Preferences
  settings: UserSettings;
  favorites: string[]; // array of stream_id
  watchHistory: Record<string, WatchHistoryItem>;

  // Actions
  loadProfiles: () => Promise<void>;
  setActiveProfile: (profile: PlaylistProfile | null) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveTab: (tab: StreamType) => void;
  setSelectedCategoryId: (catId: string) => void;
  setSearchQuery: (query: string) => void;
  loadCategoriesForTab: () => Promise<void>;
  toggleFavorite: (streamId: string | number) => void;
  isFavorite: (streamId: string | number) => boolean;
  saveWatchProgress: (item: Omit<WatchHistoryItem, 'updatedAt'>) => void;
  getResumePosition: (id: string | number) => number;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  clearHistory: () => void;
}

const SETTINGS_KEY = 'senku_settings_v1';
const FAVORITES_KEY = 'senku_favorites_v1';
const HISTORY_KEY = 'senku_history_v1';

function loadStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    hideAdult: true,
    defaultPlayerQuality: 'auto',
    preferredStreamFormat: 'm3u8',
    bufferHealthTargetSec: 15,
  };
}

function loadStoredFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function loadStoredHistory(): Record<string, WatchHistoryItem> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export const useAppStore = create<AppState>((set, get) => ({
  profiles: [],
  activeProfile: null,
  isLoadingProfiles: true,

  activeTab: 'live',
  selectedCategoryId: 'all',
  searchQuery: '',

  categories: [],
  isLoadingCategories: false,

  settings: loadStoredSettings(),
  favorites: loadStoredFavorites(),
  watchHistory: loadStoredHistory(),

  loadProfiles: async () => {
    set({ isLoadingProfiles: true });
    try {
      const list = await CatalogDb.getAllProfiles();
      const lastActiveId = localStorage.getItem('senku_last_profile_id');
      const found = list.find((p) => p.id === lastActiveId) || list[0] || null;
      set({ profiles: list, activeProfile: found, isLoadingProfiles: false });

      if (found) {
        // Auto-refresh in background if older than 12 hours
        const twelveHoursMs = 12 * 60 * 60 * 1000;
        if (found.autoRefresh12h && Date.now() - found.lastSynced > twelveHoursMs) {
          console.log('[Senku Telemetry] Background refresh triggered for profile > 12h');
        }
        await get().loadCategoriesForTab();
      }
    } catch {
      set({ isLoadingProfiles: false });
    }
  },

  setActiveProfile: async (profile) => {
    set({ activeProfile: profile, selectedCategoryId: 'all', searchQuery: '' });
    if (profile) {
      localStorage.setItem('senku_last_profile_id', profile.id);
      await get().loadCategoriesForTab();
    } else {
      localStorage.removeItem('senku_last_profile_id');
      set({ categories: [] });
    }
  },

  deleteProfile: async (id) => {
    await CatalogDb.deleteProfile(id);
    const updated = get().profiles.filter((p) => p.id !== id);
    const nextActive = get().activeProfile?.id === id ? updated[0] || null : get().activeProfile;
    set({ profiles: updated });
    await get().setActiveProfile(nextActive);
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab, selectedCategoryId: 'all', searchQuery: '' });
    get().loadCategoriesForTab();
  },

  setSelectedCategoryId: (catId) => {
    set({ selectedCategoryId: catId });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  loadCategoriesForTab: async () => {
    const { activeProfile, activeTab, settings } = get();
    if (!activeProfile) {
      set({ categories: [] });
      return;
    }
    set({ isLoadingCategories: true });
    try {
      let cats = await CatalogDb.getCategories(activeProfile.id, activeTab);
      if (settings.hideAdult) {
        const adultPattern = /(adult|xxx|porn|18\+|erotic|sex)/i;
        cats = cats.filter((c) => !adultPattern.test(c.category_name));
      }
      set({ categories: cats, isLoadingCategories: false });
    } catch {
      set({ isLoadingCategories: false, categories: [] });
    }
  },

  toggleFavorite: (streamId) => {
    const idStr = String(streamId);
    const cur = get().favorites;
    const exists = cur.includes(idStr);
    const updated = exists ? cur.filter((id) => id !== idStr) : [...cur, idStr];
    set({ favorites: updated });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  },

  isFavorite: (streamId) => {
    return get().favorites.includes(String(streamId));
  },

  saveWatchProgress: (item) => {
    const cur = { ...get().watchHistory };
    cur[item.id] = {
      ...item,
      updatedAt: Date.now(),
    };
    set({ watchHistory: cur });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(cur));
  },

  getResumePosition: (id) => {
    const record = get().watchHistory[String(id)];
    return record?.lastPositionSeconds || 0;
  },

  updateSettings: (newSettings) => {
    const merged = { ...get().settings, ...newSettings };
    set({ settings: merged });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    // Re-filter categories if hideAdult changed
    if ('hideAdult' in newSettings) {
      get().loadCategoriesForTab();
    }
  },

  clearHistory: () => {
    set({ watchHistory: {} });
    localStorage.removeItem(HISTORY_KEY);
  },
}));
