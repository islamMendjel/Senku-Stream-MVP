import React, { useEffect, useState } from 'react';
import { MovieItem } from '../../../../shared/types.js';
import { Modal } from '../common/Modal.js';
import { useAppStore } from '../../store/useAppStore.js';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import { XtreamClient } from '../../services/xtream.js';
import { Play, RotateCcw, Clock, Star, User, Film, ExternalLink } from 'lucide-react';
import { Badge } from '../common/Badge.js';

interface MovieModalProps {
  movie: MovieItem | null;
  onClose: () => void;
}

export const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose }) => {
  const { activeProfile, getResumePosition, settings } = useAppStore();
  const { playMedia } = usePlayerStore();

  const [vodInfo, setVodInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const resumePos = movie ? getResumePosition(movie.stream_id) : 0;

  useEffect(() => {
    if (!movie || !activeProfile || activeProfile.type !== 'xtream') {
      setVodInfo(null);
      return;
    }

    let isMounted = true;
    setLoadingInfo(true);

    const client = new XtreamClient(activeProfile, settings.appPassword);
    client
      .getVodInfo(movie.stream_id)
      .then((res) => {
        if (isMounted) {
          setVodInfo(res?.info || null);
          setLoadingInfo(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingInfo(false);
      });

    return () => {
      isMounted = false;
    };
  }, [movie?.stream_id, activeProfile]);

  if (!movie) return null;

  const handlePlay = (startSeconds = 0) => {
    if (!activeProfile) return;

    let streamUrl = movie.url;
    const ext = movie.container_extension || 'mp4';

    if (!streamUrl && activeProfile.type === 'xtream') {
      const client = new XtreamClient(activeProfile, settings.appPassword);
      streamUrl = client.buildMovieStreamUrl(movie.stream_id, ext);
    } else if (streamUrl && !streamUrl.startsWith('/api/')) {
      streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
    }

    if (streamUrl) {
      playMedia({
        streamId: movie.stream_id,
        name: movie.name,
        type: 'movie',
        url: streamUrl,
        poster: movie.stream_icon,
        containerExtension: ext,
      });

      // If resuming, we set initial time after player mounts
      if (startSeconds > 0) {
        usePlayerStore.getState().setTime(startSeconds);
      }

      onClose();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const plot = vodInfo?.plot || movie.plot || 'No transmission synopsis available.';
  const cast = vodInfo?.cast || movie.cast;
  const director = vodInfo?.director || movie.director;
  const releaseDate = vodInfo?.releasedate || vodInfo?.release_date || movie.release_date || movie.year;
  const duration = vodInfo?.duration || vodInfo?.episode_run_time;
  const rating = vodInfo?.rating || movie.rating;
  const youtubeTrailer = vodInfo?.youtube_trailer;

  return (
    <Modal isOpen={Boolean(movie)} onClose={onClose} title={movie.name} badgeText="VOD ARCHIVE">
      <div className="flex flex-col md:flex-row gap-5">
        {/* Left Poster */}
        <div className="w-full md:w-56 shrink-0 aspect-[2/3] bg-void rounded-xl overflow-hidden border border-borderDim shadow-lg flex items-center justify-center">
          {movie.stream_icon ? (
            <img
              src={movie.stream_icon}
              alt={movie.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Film size={40} className="text-textDim opacity-40" />
          )}
        </div>

        {/* Right Info */}
        <div className="flex-1 flex flex-col justify-between font-mono text-xs">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-textBright tracking-wide">{movie.name}</h2>

            {/* Badges strip */}
            <div className="flex flex-wrap items-center gap-2">
              {rating && (
                <span className="text-amberNeon font-semibold bg-amberNeon/10 border border-amberNeon/30 px-2 py-0.5 rounded text-[11px]">
                  ★ {rating}
                </span>
              )}
              {releaseDate && <Badge variant="cyan">{releaseDate}</Badge>}
              {duration && (
                <Badge variant="muted">
                  <Clock size={11} className="inline mr-1" />
                  {duration}
                </Badge>
              )}
              {movie.container_extension && (
                <Badge variant="muted">{movie.container_extension.toUpperCase()}</Badge>
              )}
            </div>

            {/* Plot */}
            <p className="text-textMuted text-xs leading-relaxed max-h-36 overflow-y-auto pr-1">
              {plot}
            </p>

            {/* Cast & Director */}
            <div className="text-[11px] space-y-1 text-textMuted border-t border-borderDim/50 pt-2">
              {director && (
                <div>
                  <span className="text-textDim">DIRECTOR:</span> {director}
                </div>
              )}
              {cast && (
                <div className="line-clamp-2">
                  <span className="text-textDim">CAST:</span> {cast}
                </div>
              )}
            </div>

            {/* Trailer */}
            {youtubeTrailer && (
              <a
                href={`https://www.youtube.com/watch?v=${youtubeTrailer}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-cyanNeon hover:underline text-[11px]"
              >
                <ExternalLink size={12} />
                <span>Watch Official Trailer</span>
              </a>
            )}
          </div>

          {/* Action Play Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-borderDim mt-4">
            {resumePos > 10 ? (
              <>
                <button
                  onClick={() => handlePlay(resumePos)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-portal/20 hover:bg-portal/30 text-portal border border-portal/50 rounded-lg font-bold tracking-wider shadow-portal-glow transition-all"
                >
                  <Play size={14} className="fill-portal" />
                  <span>RESUME [ {formatTime(resumePos)} ]</span>
                </button>
                <button
                  onClick={() => handlePlay(0)}
                  className="flex items-center gap-1.5 py-2.5 px-3 bg-surfaceLight hover:bg-borderDim text-textMuted hover:text-textBright border border-borderDim rounded-lg transition-colors"
                  title="Play from start"
                >
                  <RotateCcw size={13} />
                  <span>RESTART</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handlePlay(0)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-portal/20 hover:bg-portal/30 text-portal border border-portal/50 rounded-lg font-bold tracking-wider shadow-portal-glow transition-all"
              >
                <Play size={15} className="fill-portal" />
                <span>ENGAGE PLAYBACK</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
