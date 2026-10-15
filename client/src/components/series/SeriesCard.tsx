import React, { useState } from 'react';
import { SeriesItem } from '../../../../shared/types.js';
import { Clapperboard, Star } from 'lucide-react';
import { Badge } from '../common/Badge.js';

interface SeriesCardProps {
  series: SeriesItem;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  onClick,
  isFavorite,
  onToggleFavorite,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative bg-surface border border-borderDim hover:border-cyanNeon/50 rounded-xl overflow-hidden cursor-pointer flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-cyan-glow"
    >
      {/* Poster (2:3 aspect) */}
      <div className="relative w-full aspect-[2/3] bg-void overflow-hidden flex items-center justify-center">
        {series.cover && !imgError ? (
          <img
            src={series.cover}
            alt={series.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Clapperboard size={32} className="text-textDim opacity-40" />
        )}

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
      </div>

      {/* Info Body */}
      <div className="p-2.5 flex flex-col flex-1 justify-between gap-1.5">
        <h4 className="font-mono text-xs font-semibold text-textBright line-clamp-1 group-hover:text-cyanNeon transition-colors">
          {series.name}
        </h4>

        <div className="flex items-center justify-between text-[10px] font-mono text-textMuted">
          {series.rating ? (
            <span className="text-amberNeon font-medium">★ {series.rating}</span>
          ) : (
            <span className="text-textDim">SERIES</span>
          )}

          <Badge variant="cyan" size="sm">
            SERIAL
          </Badge>
        </div>
      </div>
    </div>
  );
};
