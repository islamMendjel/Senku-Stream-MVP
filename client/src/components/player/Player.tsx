import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import { useAppStore } from '../../store/useAppStore.js';
import { KittyOverlay } from './KittyOverlay.js';
import { Controls } from './Controls.js';
import { X, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { CatalogDb } from '../../services/db.js';

interface PlayerProps {
  onPreviousChannel?: () => void;
  onNextChannel?: () => void;
}

export const Player: React.FC<PlayerProps> = ({ onPreviousChannel, onNextChannel }) => {
  const {
    currentMedia,
    isOpen,
    closePlayer,
    isPlaying,
    setIsPlaying,
    isBuffering,
    setIsBuffering,
    hasError,
    errorMessage,
    setError,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    toggleFullscreen,
    isPiP,
    setTime,
    setTelemetry,
    setQualities,
    selectedQualityIndex,
    setAudioTracks,
    selectedAudioTrackIndex,
    setSubtitleTracks,
    selectedSubtitleTrackIndex,
    addTerminalLog,
  } = usePlayerStore();

  const { saveWatchProgress, activeProfile } = useAppStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimer = useRef<number | null>(null);

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = window.setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 3500);
  };

  // Fullscreen sync
  useEffect(() => {
    if (!containerRef.current) return;
    if (isFullscreen && !document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else if (!isFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [isFullscreen]);

  // Stream Initialization with Hls.js & Fallback Error Recovery
  useEffect(() => {
    if (!isOpen || !currentMedia || !videoRef.current) return;

    const video = videoRef.current;
    let streamUrl = currentMedia.url;

    setError(null);
    setIsBuffering(true);
    addTerminalLog(`[STREAM] Initiating handshake: ${currentMedia.name}`);

    // Clean up any existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let retryWithTs = false;

    const setupHls = (urlToLoad: string) => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: currentMedia.type === 'live',
          backBufferLength: 60,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
        });
        hlsRef.current = hls;

        hls.loadSource(urlToLoad);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          setIsBuffering(false);
          addTerminalLog(`[HLS] Manifest locked. Found ${data.levels.length} quality levels.`);

          const mappedQualities = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height,
            bitrate: lvl.bitrate,
            label: lvl.height ? `${lvl.height}p` : `${(lvl.bitrate / 1000000).toFixed(1)} Mbps`,
          }));
          setQualities(mappedQualities);

          video.play().catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          const level = hls.levels[data.level];
          if (level) {
            const res = `${level.width || 1920}x${level.height || 1080}`;
            const bitrateMbps = level.bitrate ? level.bitrate / 1000000 : 3.5;
            setTelemetry({ resolution: res, bitrateMbps });
            addTerminalLog(`[HLS] Quality auto-stepped: ${res} @ ${bitrateMbps.toFixed(1)} Mbps`);
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_LOADED, () => {
          const tracks = hls.audioTracks.map((t, i) => ({
            id: i,
            name: t.name || t.lang || `Track ${i + 1}`,
            lang: t.lang,
          }));
          setAudioTracks(tracks);
        });

        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
          const subs = hls.subtitleTracks.map((s, i) => ({
            id: i,
            name: s.name || s.lang || `Sub ${i + 1}`,
            lang: s.lang,
          }));
          setSubtitleTracks(subs);
        });

        // Error Recovery Handling
        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.warn('[Hls Error]', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                addTerminalLog(`[HLS ERROR] Network anomaly (${data.details}). Attempting recovery...`);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                addTerminalLog(`[HLS ERROR] Media codec anomaly (${data.details}). Recovering media buffer...`);
                hls.recoverMediaError();
                break;
              default:
                addTerminalLog(`[HLS FATAL] Unrecoverable anomaly (${data.details}).`);
                // If .m3u8 failed and was live stream, attempt fallback to .ts stream
                if (!retryWithTs && urlToLoad.includes('.m3u8')) {
                  retryWithTs = true;
                  const tsUrl = urlToLoad.replace(/\.m3u8(\b|&|\?)/, '.ts$1');
                  addTerminalLog(`[HLS FALLBACK] Switching transmission format from .m3u8 to .ts...`);
                  hls.destroy();
                  setupHls(tsUrl);
                } else {
                  setError(`Dimension breach: Stream transmission dropped (${data.details})`);
                  hls.destroy();
                }
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari / iOS)
        video.src = urlToLoad;
        video.play().catch(() => setIsPlaying(false));
      } else {
        // Direct MP4 / MKV video source fallback
        video.src = urlToLoad;
        video.play().catch(() => setIsPlaying(false));
      }
    };

    setupHls(streamUrl);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [currentMedia?.url, isOpen]);

  // Video Event Handlers (Telemetry & State)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setTime(cur, dur);

    // Calculate buffer health
    let bufferEnd = cur;
    for (let i = 0; i < videoRef.current.buffered.length; i++) {
      if (
        videoRef.current.buffered.start(i) <= cur &&
        videoRef.current.buffered.end(i) >= cur
      ) {
        bufferEnd = videoRef.current.buffered.end(i);
        break;
      }
    }
    const health = Math.max(0, bufferEnd - cur);
    setTelemetry({ bufferHealth: health });
  };

  // Periodic Watch History Save (for VOD & Series)
  useEffect(() => {
    if (!currentMedia || currentMedia.type === 'live') return;

    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveWatchProgress({
          id: String(currentMedia.streamId),
          type: currentMedia.type,
          title: currentMedia.name,
          subtitle: currentMedia.subtitle,
          poster: currentMedia.poster,
          lastPositionSeconds: Math.floor(videoRef.current.currentTime),
          durationSeconds: Math.floor(videoRef.current.duration || 0),
          url: currentMedia.url,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentMedia]);

  // Auto-Play Next Episode for Series
  const handleVideoEnded = async () => {
    if (
      currentMedia?.type === 'series' &&
      currentMedia.seriesId &&
      currentMedia.seasonNum !== undefined &&
      currentMedia.episodeNum !== undefined &&
      activeProfile
    ) {
      addTerminalLog(`[SERIAL] Episode concluded. Querying next episode in sequence...`);

      try {
        const nextEpNum = currentMedia.episodeNum + 1;
        const allEpisodes = await CatalogDb.getSeriesEpisodes(activeProfile.id, currentMedia.seriesId);
        const nextEp = allEpisodes.find(
          (ep) =>
            Number(ep.season) === currentMedia.seasonNum &&
            Number(ep.episode_num) === nextEpNum
        );

        if (nextEp && nextEp.url) {
          addTerminalLog(`[SERIAL] Auto-engaging S${currentMedia.seasonNum}E${nextEpNum}: ${nextEp.title}`);
          usePlayerStore.getState().playMedia({
            streamId: nextEp.id,
            name: currentMedia.name,
            type: 'series',
            url: nextEp.url.startsWith('/api/') ? nextEp.url : `/api/stream?url=${encodeURIComponent(nextEp.url)}`,
            poster: currentMedia.poster,
            subtitle: `S${String(currentMedia.seasonNum).padStart(2, '0')}E${String(nextEpNum).padStart(2, '0')} • ${nextEp.title}`,
            seriesId: currentMedia.seriesId,
            seasonNum: currentMedia.seasonNum,
            episodeNum: nextEpNum,
          });
        }
      } catch (err) {
        console.error('Error auto-playing next episode:', err);
      }
    }
  };

  // Sync Player Volume & Play/Pause State with Store
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Quality switch listener
  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = selectedQualityIndex;
    }
  }, [selectedQualityIndex]);

  // Audio track switch listener
  useEffect(() => {
    if (hlsRef.current && selectedAudioTrackIndex >= 0) {
      hlsRef.current.audioTrack = selectedAudioTrackIndex;
    }
  }, [selectedAudioTrackIndex]);

  // Subtitle track switch listener
  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = selectedSubtitleTrackIndex;
    }
  }, [selectedSubtitleTrackIndex]);

  // Keyboard Shortcuts (Space, F, M, Arrows, N, P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!isOpen || !videoRef.current) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          usePlayerStore.getState().toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(
            videoRef.current.duration || 0,
            videoRef.current.currentTime + 10
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          usePlayerStore.getState().setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          usePlayerStore.getState().setVolume(Math.max(0, volume - 0.1));
          break;
        case 'n':
        case 'N':
          if (currentMedia?.type === 'live' && onNextChannel) {
            e.preventDefault();
            onNextChannel();
          }
          break;
        case 'p':
        case 'P':
          if (currentMedia?.type === 'live' && onPreviousChannel) {
            e.preventDefault();
            onPreviousChannel();
          }
          break;
        case '`':
        case '~':
          e.preventDefault();
          usePlayerStore.getState().toggleTerminalOverlay();
          break;
        case 'Escape':
          if (!document.fullscreenElement) {
            closePlayer();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, volume, currentMedia, onNextChannel, onPreviousChannel]);

  if (!isOpen || !currentMedia) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-40 bg-black flex items-center justify-center overflow-hidden cursor-default"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onError={() => {
          setError('Dimension breach: Stream codec decoding failed');
          setIsBuffering(false);
        }}
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-full h-full object-contain"
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-void/80 border border-borderDim backdrop-blur-md">
            <Loader2 size={32} className="text-portal animate-spin-fast shadow-portal-glow" />
            <span className="font-mono text-xs text-portal tracking-wider animate-pulse">
              Buffering stream telemetry...
            </span>
          </div>
        </div>
      )}

      {/* Error Modal Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-void/90 backdrop-blur-md p-6 z-50">
          <div className="max-w-md w-full bg-surface border border-dangerNeon/50 rounded-xl p-5 shadow-2xl text-center space-y-4 hypr-active-border">
            <AlertCircle size={36} className="text-dangerNeon mx-auto" />
            <h3 className="font-mono text-sm font-bold text-dangerNeon uppercase tracking-wider">
              {errorMessage || 'Dimension breach: Signal Lost'}
            </h3>
            <p className="font-mono text-xs text-textMuted">
              Upstream node terminated stream connection or format mismatch occurred.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setError(null);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-portal/20 hover:bg-portal/30 text-portal border border-portal/40 rounded-lg text-xs font-mono font-semibold transition-all"
              >
                <RefreshCw size={13} />
                <span>RE-ENGAGE</span>
              </button>
              <button
                onClick={closePlayer}
                className="px-4 py-2 bg-surfaceLight hover:bg-borderDim text-textMuted hover:text-textBright rounded-lg text-xs font-mono transition-colors"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Right Close Button */}
      <div
        className={`absolute top-4 right-4 z-40 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={closePlayer}
          className="p-2 bg-void/80 hover:bg-dangerNeon/20 text-textMuted hover:text-dangerNeon border border-borderDim hover:border-dangerNeon/40 rounded-lg backdrop-blur-md transition-all shadow-lg"
          title="Close Player [Esc]"
        >
          <X size={18} />
        </button>
      </div>

      {/* Kitty Terminal Overlay */}
      <KittyOverlay />

      {/* Controls Overlay */}
      <div
        className={`transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Controls
          onSeek={(seconds) => {
            if (videoRef.current) {
              videoRef.current.currentTime = seconds;
            }
          }}
          onVolumeChange={(vol) => {
            usePlayerStore.getState().setVolume(vol);
          }}
          onPreviousChannel={onPreviousChannel}
          onNextChannel={onNextChannel}
        />
      </div>
    </div>
  );
};
