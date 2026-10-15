import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { Waybar } from './Waybar.js';
import { Search, Star, Radio, Flame, Hash, ListFilter } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onOpenOnboarding: () => void;
  onOpenSettings: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenOnboarding, onOpenSettings }) => {
  const {
    activeTab,
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    searchQuery,
    setSearchQuery,
    favorites,
    isLoadingCategories,
  } = useAppStore();

  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredCategories = categories.filter((c) =>
    c.category_name.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-void overflow-hidden">
      {/* Top Waybar */}
      <Waybar onOpenOnboarding={onOpenOnboarding} onOpenSettings={onOpenSettings} />

      {/* Main Hyprland Tiled Workspace */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left Category Sidebar (Tiled Panel) */}
        <aside className="w-64 bg-surface/90 border border-borderDim rounded-xl flex flex-col overflow-hidden shrink-0 transition-all duration-200">
          {/* Sidebar Search & Filter Header */}
          <div className="p-2.5 border-b border-borderDim flex flex-col gap-2 bg-surfaceLight/30">
            <div className="flex items-center justify-between text-[11px] font-mono text-textMuted uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-cyanNeon">
                <ListFilter size={12} />
                <span>CATEGORIES</span>
              </span>
              <span className="text-textDim">[{filteredCategories.length}]</span>
            </div>

            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textDim" />
              <input
                type="text"
                placeholder="Filter categories..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-void/70 border border-borderDim focus:border-cyanNeon/50 rounded text-xs font-mono text-textBright focus:outline-none placeholder:text-textDim"
              />
            </div>
          </div>

          {/* Category List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {/* "All" Special Category */}
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 ${
                selectedCategoryId === 'all'
                  ? 'bg-portal/20 text-portal border border-portal/40 font-semibold shadow-portal-glow'
                  : 'text-textBright hover:bg-surfaceLight/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Hash size={13} className={selectedCategoryId === 'all' ? 'text-portal' : 'text-cyanNeon'} />
                <span className="truncate">ALL CHANNELS</span>
              </div>
            </button>

            {/* "Favorites" Special Category */}
            <button
              onClick={() => setSelectedCategoryId('favorites')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 ${
                selectedCategoryId === 'favorites'
                  ? 'bg-amberNeon/20 text-amberNeon border border-amberNeon/40 font-semibold'
                  : 'text-textBright hover:bg-surfaceLight/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Star size={13} className="text-amberNeon fill-amberNeon/20" />
                <span className="truncate">FAVORITES</span>
              </div>
              <span className="text-[10px] text-textMuted font-mono">[{favorites.length}]</span>
            </button>

            <div className="my-1.5 border-t border-borderDim/50" />

            {/* Loading Skeletons */}
            {isLoadingCategories && (
              <div className="space-y-1.5 p-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-7 skeleton-neon rounded-lg" />
                ))}
              </div>
            )}

            {/* Dynamic Categories */}
            {!isLoadingCategories &&
              filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.category_id;
                return (
                  <button
                    key={cat.category_id}
                    onClick={() => setSelectedCategoryId(cat.category_id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 ${
                      isSelected
                        ? 'bg-cyanNeon/15 text-cyanNeon border border-cyanNeon/40 font-medium'
                        : 'text-textMuted hover:text-textBright hover:bg-surfaceLight/60 border border-transparent'
                    }`}
                  >
                    <span className="truncate text-left">{cat.category_name}</span>
                  </button>
                );
              })}

            {!isLoadingCategories && filteredCategories.length === 0 && (
              <div className="text-center py-6 text-xs font-mono text-textDim">
                Null set. No categories match.
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace Panel */}
        <main className="flex-1 flex flex-col bg-surface/90 border border-borderDim rounded-xl overflow-hidden relative">
          {/* Top Search Bar & Telemetry Strip */}
          <div className="h-11 px-4 border-b border-borderDim flex items-center justify-between bg-surfaceLight/30 gap-4 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyanNeon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab.toUpperCase()} catalog... (keyboard: /)`}
                className="w-full pl-9 pr-4 py-1.5 bg-void/80 border border-borderDim focus:border-cyanNeon rounded-lg text-xs font-mono text-textBright focus:outline-none placeholder:text-textDim transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-textMuted">
              <span className="text-[11px] text-portal uppercase">
                [ SCOPE: {activeTab.toUpperCase()} ]
              </span>
            </div>
          </div>

          {/* Child Viewport */}
          <div className="flex-1 overflow-hidden relative">{children}</div>
        </main>
      </div>
    </div>
  );
};
