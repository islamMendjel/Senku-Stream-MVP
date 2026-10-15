import React, { useState } from 'react';
import { LiveChannel, EpgProgram } from '../../../../shared/types.js';
import { Star, Tv, Radio } from 'lucide-react';
import { Badge } from '../common/Badge.js';

interface ChannelItemProps {
  channel: LiveChannel;
  isSelected: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  epgProgram?: EpgProgram;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  isSelected,
  isPlaying,
  isFavorite,
  onSelect,
  onToggleFavorite,
  epgProgram,
}) => {
  const [imgError, setImgError] = useState(false);

  // Calculate EPG progress percentage if current program exists
  let progressPct = 0;
  if (epgProgram) {
    const now = Math.floor(Date.now() / 1000);
    const start = epgProgram.start_timestamp;
    const end = epgProgram.stop_timestamp;
    if (end > start && now >= start && now <= end) {
      progressPct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-150 border ${
        isSelected
          ? 'bg-portal/15 border-portal/50 shadow-portal-glow'
          : isPlaying
          ? 'bg-cyanNeon/10 border-cyanNeon/40'
          : 'bg-surfaceLight/30 border-borderDim hover:border-cyanNeon/30 hover:bg-surfaceLight/70'
      }`}
    >
      {/* Left: Channel Number / Logo / Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Channel Icon or Fallback */}
        <div className="w-10 h-10 rounded-md bg-void border border-borderDim overflow-hidden flex items-center justify-center shrink-0 p-1">
          {channel.stream_icon && !imgError ? (
            <img
              src={channel.stream_icon}
              alt={channel.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <Tv size={16} className="text-textDim" />
          )}
        </div>

        {/* Channel Name & EPG snippet */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-textBright truncate">
              {channel.name}
            </span>
            {isPlaying && (
              <span className="w-2 h-2 rounded-full bg-portal animate-pulse-glow shrink-0" />
            )}
          </div>

          {/* Current EPG program or placeholder */}
          <div className="mt-1 flex flex-col gap-1">
            <span className="text-[11px] font-mono text-textMuted truncate">
              {epgProgram ? epgProgram.title : 'No program telemetry'}
            </span>

            {/* EPG mini progress bar */}
            {epgProgram && progressPct > 0 && (
              <div className="w-full h-1 bg-void rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyanNeon rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions & Badges */}
      <div className="flex items-center gap-2 pl-3 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`p-1.5 rounded transition-colors ${
            isFavorite
              ? 'text-amberNeon'
              : 'text-textDim opacity-0 group-hover:opacity-100 hover:text-amberNeon'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={14} className={isFavorite ? 'fill-amberNeon' : ''} />
        </button>
      </div>
    </div>
  );
};
