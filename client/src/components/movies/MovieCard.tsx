import React, { useState } from 'react';
import { MovieItem } from '../../../../shared/types.js';
import { Film, Play, Star } from 'lucide-react';
import { Badge } from '../common/Badge.js';

interface MovieCardProps {
  movie: MovieItem;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  resumeSeconds?: number;
  durationSeconds?: number;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onClick,
  isFavorite,
  onToggleFavorite,
  resumeSeconds = 0,
  durationSeconds = 0,
}) => {
  const [imgError, setImgError] = useState(false);

  const progressPct =
    durationSeconds > 0 && resumeSeconds > 0
      ? Math.min(100, (resumeSeconds / durationSeconds) * 100)
      : 0;

  return (
    <div
      onClick={onClick}
      className="group relative bg-surface border border-borderDim hover:border-cyanNeon/50 rounded-xl overflow-hidden cursor-pointer flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-cyan-glow"
    >
      {/* Poster Aspect Ratio Container (2:3) */}
      <div className="relative w-full aspect-[2/3] bg-void overflow-hidden flex items-center justify-center">
        {movie.stream_icon && !imgError ? (
          <img
            src={movie.stream_icon}
            alt={movie.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Film size={32} className="text-textDim opacity-40" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />

        {/* Favorite Icon */}
        <button
          onClick={onToggleFavorite}
          className={`absolute top-2 right-2 p-1.5 rounded-md bg-void/70 backdrop-blur-md border border-borderDim transition-all ${
            isFavorite ? 'text-amberNeon' : 'text-textDim opacity-0 group-hover:opacity-100 hover:text-amberNeon'
          }`}
        >
          <Star size={13} className={isFavorite ? 'fill-amberNeon' : ''} />
        </button>

        {/* Hover Quick Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-portal/20 backdrop-blur-md border border-portal text-portal flex items-center justify-center shadow-portal-glow transform scale-90 group-hover:scale-100 transition-transform">
            <Play size={20} className="fill-portal ml-0.5" />
          </div>
        </div>

        {/* Resume progress bar */}
        {progressPct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-void/90">
            <div
              className="h-full bg-portal shadow-portal-glow"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-2.5 flex flex-col flex-1 justify-between gap-1.5">
        <h4 className="font-mono text-xs font-semibold text-textBright line-clamp-1 group-hover:text-cyanNeon transition-colors">
          {movie.name}
        </h4>

        <div className="flex items-center justify-between text-[10px] font-mono text-textMuted">
          {movie.rating ? (
            <span className="text-amberNeon font-medium">★ {movie.rating}</span>
          ) : (
            <span className="text-textDim">VOD</span>
          )}

          {movie.container_extension && (
            <Badge variant="muted" size="sm">
              {movie.container_extension.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
