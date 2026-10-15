import React, { useEffect, useState, useMemo } from 'react';
import { MovieItem } from '../../../../shared/types.js';
import { useAppStore } from '../../store/useAppStore.js';
import { CatalogDb } from '../../services/db.js';
import { MovieCard } from './MovieCard.js';
import { MovieModal } from './MovieModal.js';
import { Film } from 'lucide-react';
import { Skeleton } from '../common/Skeleton.js';

export const MoviesView: React.FC = () => {
  const {
    activeProfile,
    selectedCategoryId,
    searchQuery,
    favorites,
    toggleFavorite,
    isFavorite,
    getResumePosition,
  } = useAppStore();

  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);

  useEffect(() => {
    if (!activeProfile) {
      setMovies([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    CatalogDb.getMovies(activeProfile.id, selectedCategoryId === 'favorites' ? undefined : selectedCategoryId)
      .then((data) => {
        if (!isMounted) return;
        let list = data;
        if (selectedCategoryId === 'favorites') {
          list = list.filter((m) => favorites.includes(String(m.stream_id)));
        }
        setMovies(list);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching movies:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProfile?.id, selectedCategoryId, favorites]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    const q = searchQuery.toLowerCase();
    return movies.filter((m) => m.name.toLowerCase().includes(q));
  }, [movies, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top Telemetry Strip */}
      <div className="px-4 py-2 bg-surfaceLight/20 border-b border-borderDim flex items-center justify-between text-[11px] font-mono text-textMuted shrink-0">
        <div className="flex items-center gap-2">
          <Film size={12} className="text-cyanNeon" />
          <span>VOD CATALOG SIZE:</span>
          <span className="text-textBright font-semibold tabular-nums">
            {filteredMovies.length.toLocaleString()}
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
        ) : filteredMovies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center font-mono text-xs text-textDim p-8">
            <Film size={32} className="mb-3 opacity-30 text-cyanNeon" />
            <p>Null set. No films located on this sector.</p>
            {searchQuery && (
              <p className="text-[11px] mt-1 text-textMuted">
                Query "{searchQuery}" yielded 0 coordinates.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3.5">
            {filteredMovies.map((movie) => {
              const resumePos = getResumePosition(movie.stream_id);
              return (
                <MovieCard
                  key={movie.stream_id}
                  movie={movie}
                  isFavorite={isFavorite(movie.stream_id)}
                  resumeSeconds={resumePos}
                  onToggleFavorite={(e) => {
                    e.stopPropagation();
                    toggleFavorite(movie.stream_id);
                  }}
                  onClick={() => setSelectedMovie(movie)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
  );
};
