import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LiveChannel } from '../../../../shared/types.js';
import { useAppStore } from '../../store/useAppStore.js';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import { CatalogDb } from '../../services/db.js';
import { XtreamClient } from '../../services/xtream.js';
import { ChannelItem } from './ChannelItem.js';
import { EpgBar } from './EpgBar.js';
import { Tv, Radio, Sparkles } from 'lucide-react';
import { Skeleton } from '../common/Skeleton.js';

export const LiveView: React.FC = () => {
  const {
    activeProfile,
    selectedCategoryId,
    searchQuery,
    favorites,
    toggleFavorite,
    isFavorite,
    settings,
  } = useAppStore();

  const { playMedia, currentMedia } = usePlayerStore();

  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);

  // Load channels from IndexedDB
  useEffect(() => {
    if (!activeProfile) {
      setChannels([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    CatalogDb.getLiveChannels(activeProfile.id, selectedCategoryId === 'favorites' ? undefined : selectedCategoryId)
      .then((data) => {
        if (!isMounted) return;
        let list = data;
        if (selectedCategoryId === 'favorites') {
          list = list.filter((ch) => favorites.includes(String(ch.stream_id)));
        }
        setChannels(list);
        if (list.length > 0 && !selectedChannel) {
          setSelectedChannel(list[0]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching live channels:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeProfile?.id, selectedCategoryId, favorites]);

  // Search filtering
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter((ch) => ch.name.toLowerCase().includes(q));
  }, [channels, searchQuery]);

  // Virtualizer
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredChannels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const handlePlayChannel = (channel: LiveChannel) => {
    if (!activeProfile) return;

    let streamUrl = channel.url;
    if (!streamUrl && activeProfile.type === 'xtream') {
      const xtream = new XtreamClient(activeProfile, settings.appPassword);
      streamUrl = xtream.buildLiveStreamUrl(channel.stream_id, settings.preferredStreamFormat || 'm3u8');
    } else if (streamUrl && !streamUrl.startsWith('/api/')) {
      streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
    }

    if (streamUrl) {
      playMedia({
        streamId: channel.stream_id,
        name: channel.name,
        type: 'live',
        url: streamUrl,
        poster: channel.stream_icon,
        subtitle: `CH ${channel.num || channel.stream_id}`,
      });
    }
  };

  // Keyboard navigation for channels (ArrowUp, ArrowDown, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (!filteredChannels.length) return;
      const currentIndex = selectedChannel
        ? filteredChannels.findIndex((c) => c.stream_id === selectedChannel.stream_id)
        : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(filteredChannels.length - 1, currentIndex + 1);
        setSelectedChannel(filteredChannels[nextIdx]);
        rowVirtualizer.scrollToIndex(nextIdx, { align: 'auto' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(0, currentIndex - 1);
        setSelectedChannel(filteredChannels[prevIdx]);
        rowVirtualizer.scrollToIndex(prevIdx, { align: 'auto' });
      } else if (e.key === 'Enter' && selectedChannel) {
        e.preventDefault();
        handlePlayChannel(selectedChannel);
      } else if ((e.key === 'f' || e.key === 'F') && selectedChannel) {
        e.preventDefault();
        toggleFavorite(selectedChannel.stream_id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredChannels, selectedChannel]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Virtualized Channel List */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Info Strip */}
        <div className="px-4 py-2 bg-surfaceLight/20 border-b border-borderDim flex items-center justify-between text-[11px] font-mono text-textMuted shrink-0">
          <div className="flex items-center gap-2">
            <Radio size={12} className="text-portal" />
            <span>TRANSMITTING SIGNALS:</span>
            <span className="text-textBright font-semibold tabular-nums">
              {filteredChannels.length.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-textDim text-[10px]">
            <span>[ ▲/▼ NAVIGATE ]</span>
            <span>[ ENTER PLAY ]</span>
            <span>[ F FAVORITE ]</span>
          </div>
        </div>

        {/* List Content */}
        <div ref={parentRef} className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-16 w-full" count={8} />
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center font-mono text-xs text-textDim p-8">
              <Tv size={32} className="mb-3 opacity-30 text-portal" />
              <p>Null set. No live channels broadcast on this frequency.</p>
              {searchQuery && (
                <p className="text-[11px] mt-1 text-textMuted">
                  Query "{searchQuery}" yielded 0 coordinates.
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const channel = filteredChannels[virtualRow.index];
                const isSelected = selectedChannel?.stream_id === channel.stream_id;
                const isPlaying = String(currentMedia?.streamId) === String(channel.stream_id);

                return (
                  <div
                    key={channel.stream_id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="p-1"
                  >
                    <ChannelItem
                      channel={channel}
                      isSelected={isSelected}
                      isPlaying={isPlaying}
                      isFavorite={isFavorite(channel.stream_id)}
                      onSelect={() => {
                        setSelectedChannel(channel);
                        handlePlayChannel(channel);
                      }}
                      onToggleFavorite={() => toggleFavorite(channel.stream_id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right EPG Telemetry Bar */}
      <EpgBar channel={selectedChannel} onPlay={handlePlayChannel} />
    </div>
  );
};
