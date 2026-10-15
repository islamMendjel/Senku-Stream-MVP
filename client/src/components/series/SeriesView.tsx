import React, { useEffect, useState, useMemo } from 'react';
import { SeriesItem } from '../../../../shared/types.js';
import { useAppStore } from '../../store/useAppStore.js';
import { CatalogDb } from '../../services/db.js';
import { SeriesCard } from './SeriesCard.js';
import { SeriesModal } from './SeriesModal.js';
import { Clapperboard } from 'lucide-react';
import { Skeleton } from '../common/Skeleton.js';

export const SeriesView: React.FC = () => {
  const {
    activeProfile,
    selectedCategoryId,
    searchQuery,
    favorites,
    toggleFavorite,
    isFavorite,
  } = useAppStore();

  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);

  useEffect(() => {
    if (!activeProfile) {
      setSeriesList([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    CatalogDb.getSeries(activeProfile.id, selectedCategoryId === 'favorites' ? undefined : selectedCategoryId)
      .then((data) => {
        if (!isMounted) return;
        let list = data;
        if (selectedCategoryId === 'favorites') {
          list = list.filter((s) => favorites.includes(String(s.series_id)));
        }
        setSeriesList(list);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching series:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProfile?.id, selectedCategoryId, favorites]);

  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return seriesList;
    const q = searchQuery.toLowerCase();
    return seriesList.filter((s) => s.name.toLowerCase().includes(q));
  }, [seriesList, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top Telemetry Strip */}
      <div className="px-4 py-2 bg-surfaceLight/20 border-b border-borderDim flex items-center justify-between text-[11px] font-mono text-textMuted shrink-0">
        <div className="flex items-center gap-2">
          <Clapperboard size={12} className="text-amberNeon" />
          <span>SERIES CATALOG SIZE:</span>
          <span className="text-textBright font-semibold tabular-nums">
            {filteredSeries.length.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] skeleton-neon rounded-xl" />
            ))}
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center font-mono text-xs text-textDim p-8">
            <Clapperboard size={32} className="mb-3 opacity-30 text-amberNeon" />
            <p>Null set. No serialized broadcasts located on this frequency.</p>
            {searchQuery && (
              <p className="text-[11px] mt-1 text-textMuted">
                Query "{searchQuery}" yielded 0 coordinates.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3.5">
            {filteredSeries.map((series) => (
              <SeriesCard
                key={series.series_id}
                series={series}
                isFavorite={isFavorite(series.series_id)}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  toggleFavorite(series.series_id);
                }}
                onClick={() => setSelectedSeries(series)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Series Detail Modal */}
      <SeriesModal series={selectedSeries} onClose={() => setSelectedSeries(null)} />
    </div>
  );
};
