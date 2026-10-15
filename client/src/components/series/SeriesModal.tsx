import React, { useEffect, useState } from 'react';
import { SeriesItem, SeriesEpisode } from '../../../../shared/types.js';
import { Modal } from '../common/Modal.js';
import { useAppStore } from '../../store/useAppStore.js';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import { XtreamClient } from '../../services/xtream.js';
import { CatalogDb } from '../../services/db.js';
import { Play, Clapperboard, Star, Clock, Layers } from 'lucide-react';
import { Badge } from '../common/Badge.js';
import { Skeleton } from '../common/Skeleton.js';

interface SeriesModalProps {
  series: SeriesItem | null;
  onClose: () => void;
}

export const SeriesModal: React.FC<SeriesModalProps> = ({ series, onClose }) => {
  const { activeProfile, settings, getResumePosition } = useAppStore();
  const { playMedia } = usePlayerStore();

  const [episodesMap, setEpisodesMap] = useState<Record<string, SeriesEpisode[]>>({});
  const [selectedSeason, setSelectedSeason] = useState<string>('1');
  const [isLoading, setIsLoading] = useState(false);
  const [plot, setPlot] = useState<string>('');

  useEffect(() => {
    if (!series || !activeProfile) {
      setEpisodesMap({});
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    if (activeProfile.type === 'xtream') {
      const client = new XtreamClient(activeProfile, settings.appPassword);
      client
        .getSeriesInfo(series.series_id)
        .then((detail) => {
          if (!isMounted) return;
          const eps = detail.episodes || {};
          setEpisodesMap(eps);
          if (detail.info?.plot) setPlot(detail.info.plot);

          const seasonKeys = Object.keys(eps);
          if (seasonKeys.length > 0) {
            setSelectedSeason(seasonKeys[0]);
          }
          setIsLoading(false);
        })
        .catch(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      // M3U series from local DB
      CatalogDb.getSeriesEpisodes(activeProfile.id, String(series.series_id))
        .then((eps) => {
          if (!isMounted) return;
          const grouped: Record<string, SeriesEpisode[]> = {};
          for (const ep of eps) {
            const sKey = String(ep.season || 1);
            if (!grouped[sKey]) grouped[sKey] = [];
            grouped[sKey].push(ep);
          }
          setEpisodesMap(grouped);
          const seasonKeys = Object.keys(grouped);
          if (seasonKeys.length > 0) {
            setSelectedSeason(seasonKeys[0]);
          }
          setIsLoading(false);
        })
        .catch(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [series?.series_id, activeProfile]);

  if (!series) return null;

  const seasonsList = Object.keys(episodesMap).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );

  const currentEpisodes = episodesMap[selectedSeason] || [];

  const handlePlayEpisode = (episode: SeriesEpisode) => {
    if (!activeProfile) return;

    let streamUrl = episode.url;
    const ext = episode.container_extension || 'mp4';

    if (!streamUrl && activeProfile.type === 'xtream') {
      const client = new XtreamClient(activeProfile, settings.appPassword);
      streamUrl = client.buildEpisodeStreamUrl(episode.id, ext);
    } else if (streamUrl && !streamUrl.startsWith('/api/')) {
      streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
    }

    if (streamUrl) {
      playMedia({
        streamId: episode.id,
        name: series.name,
        type: 'series',
        url: streamUrl,
        poster: series.cover,
        subtitle: `S${String(selectedSeason).padStart(2, '0')}E${String(episode.episode_num).padStart(2, '0')} • ${episode.title}`,
        containerExtension: ext,
        seriesId: String(series.series_id),
        seasonNum: parseInt(selectedSeason, 10),
        episodeNum: typeof episode.episode_num === 'number' ? episode.episode_num : parseInt(String(episode.episode_num), 10),
      });

      onClose();
    }
  };

  return (
    <Modal
      isOpen={Boolean(series)}
      onClose={onClose}
      title={series.name}
      badgeText="SERIES LOG"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-5 font-mono text-xs">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row gap-4 p-3 bg-surfaceLight/30 border border-borderDim rounded-xl">
          <div className="w-24 md:w-32 aspect-[2/3] bg-void rounded-lg overflow-hidden border border-borderDim shrink-0 flex items-center justify-center">
            {series.cover ? (
              <img src={series.cover} alt={series.name} className="w-full h-full object-cover" />
            ) : (
              <Clapperboard size={28} className="text-textDim opacity-40" />
            )}
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-textBright">{series.name}</h3>

              <div className="flex items-center gap-2">
                {series.rating && (
                  <span className="text-amberNeon font-medium bg-amberNeon/10 border border-amberNeon/30 px-2 py-0.5 rounded text-[11px]">
                    ★ {series.rating}
                  </span>
                )}
                {series.genre && <Badge variant="cyan">{series.genre}</Badge>}
                <Badge variant="muted">{seasonsList.length} SEASONS</Badge>
              </div>

              <p className="text-textMuted text-xs leading-relaxed line-clamp-3">
                {plot || series.plot || 'No serial plot metadata indexed.'}
              </p>
            </div>
          </div>
        </div>

        {/* Season Selector Tabs */}
        {seasonsList.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-borderDim">
            <span className="text-textDim text-[11px] mr-2 shrink-0 flex items-center gap-1">
              <Layers size={12} /> SEASONS:
            </span>
            {seasonsList.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSeason(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 ${
                  selectedSeason === s
                    ? 'bg-portal/20 text-portal border border-portal/50 shadow-portal-glow'
                    : 'text-textMuted hover:text-textBright bg-surfaceLight/50 border border-transparent'
                }`}
              >
                [ SEASON {s.padStart(2, '0')} ]
              </button>
            ))}
          </div>
        )}

        {/* Episodes List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" count={5} />
            </div>
          ) : currentEpisodes.length === 0 ? (
            <div className="text-center py-8 text-textDim">
              Null set. No episodes mapped for Season {selectedSeason}.
            </div>
          ) : (
            currentEpisodes.map((ep) => {
              const resumePos = getResumePosition(ep.id);
              return (
                <div
                  key={ep.id}
                  onClick={() => handlePlayEpisode(ep)}
                  className="group flex items-center justify-between p-3 bg-surfaceLight/30 hover:bg-surfaceLight border border-borderDim hover:border-portal/40 rounded-xl cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-8 h-8 rounded-lg bg-void border border-borderDim flex items-center justify-center font-bold text-portal text-xs shrink-0 group-hover:border-portal/50">
                      E{String(ep.episode_num).padStart(2, '0')}
                    </span>

                    <div className="flex flex-col truncate">
                      <span className="font-semibold text-textBright group-hover:text-portal transition-colors truncate">
                        {ep.title || `Episode ${ep.episode_num}`}
                      </span>
                      {resumePos > 10 && (
                        <span className="text-[10px] text-amberNeon">
                          Resume position: {Math.floor(resumePos / 60)}m
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="p-2 rounded-lg bg-portal/10 group-hover:bg-portal text-portal group-hover:text-void border border-portal/30 transition-all shadow-portal-glow">
                      <Play size={13} className="fill-current" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
