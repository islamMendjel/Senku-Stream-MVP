import { create } from 'zustand';
import { StreamType } from '../../../shared/types.js';

export interface PlayingTrack {
  id: number;
  name: string;
  lang?: string;
}

export interface PlayingMedia {
  streamId: string | number;
  name: string;
  type: StreamType;
  url: string;
  poster?: string;
  subtitle?: string; // e.g. "HBO East HD" or "S01E02 - Pilot"
  containerExtension?: string;
  seriesId?: string;
  seasonNum?: number;
  episodeNum?: number;
}

interface PlayerState {
  currentMedia: PlayingMedia | null;
  isOpen: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  hasError: boolean;
  errorMessage: string | null;

  // Stream telemetry
  duration: number;
  currentTime: number;
  volume: number; // 0..1
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  isPiP: boolean;

  // HLS Metrics
  currentResolution: string; // e.g. "1920x1080"
  currentBitrateMbps: number; // e.g. 4.8
  bufferHealthSeconds: number;
  qualities: { id: number; height: number; bitrate: number; label: string }[];
  selectedQualityIndex: number; // -1 for auto
  audioTracks: PlayingTrack[];
  selectedAudioTrackIndex: number;
  subtitleTracks: PlayingTrack[];
  selectedSubtitleTrackIndex: number; // -1 for off

  // Terminal overlay
  showTerminalOverlay: boolean;
  terminalLogs: string[];

  // Actions
  playMedia: (media: PlayingMedia) => void;
  closePlayer: () => void;
  setIsPlaying: (playing: boolean) => void;
  setIsBuffering: (buffering: boolean) => void;
  setError: (msg: string | null) => void;
  setTime: (current: number, duration?: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
  setTelemetry: (stats: {
    resolution?: string;
    bitrateMbps?: number;
    bufferHealth?: number;
  }) => void;
  setQualities: (qualities: { id: number; height: number; bitrate: number; label: string }[]) => void;
  setSelectedQuality: (idx: number) => void;
  setAudioTracks: (tracks: PlayingTrack[]) => void;
  setSelectedAudioTrack: (idx: number) => void;
  setSubtitleTracks: (tracks: PlayingTrack[]) => void;
  setSelectedSubtitleTrack: (idx: number) => void;
  toggleTerminalOverlay: () => void;
  addTerminalLog: (line: string) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentMedia: null,
  isOpen: false,
  isPlaying: false,
  isBuffering: false,
  hasError: false,
  errorMessage: null,

  duration: 0,
  currentTime: 0,
  volume: 0.8,
  isMuted: false,
  playbackRate: 1.0,
  isFullscreen: false,
  isPiP: false,

  currentResolution: 'HD',
  currentBitrateMbps: 0,
  bufferHealthSeconds: 0,
  qualities: [],
  selectedQualityIndex: -1,
  audioTracks: [],
  selectedAudioTrackIndex: 0,
  subtitleTracks: [],
  selectedSubtitleTrackIndex: -1,

  showTerminalOverlay: true,
  terminalLogs: ['[SYSTEM] Kernel loaded. Ready for signal telemetry.'],

  playMedia: (media) => {
    const logLine = `❯ senku@iptv ~ $ stream-connect "${media.name}" [type: ${media.type.toUpperCase()}]`;
    set({
      currentMedia: media,
      isOpen: true,
      isPlaying: true,
      isBuffering: true,
      hasError: false,
      errorMessage: null,
      currentTime: 0,
      duration: 0,
      qualities: [],
      audioTracks: [],
      subtitleTracks: [],
      terminalLogs: [logLine],
    });
  },

  closePlayer: () => {
    set({
      currentMedia: null,
      isOpen: false,
      isPlaying: false,
      isBuffering: false,
      hasError: false,
      errorMessage: null,
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsBuffering: (isBuffering) => set({ isBuffering }),
  setError: (errorMessage) => set({ hasError: Boolean(errorMessage), errorMessage, isBuffering: false }),
  setTime: (currentTime, duration) =>
    set((state) => ({
      currentTime,
      duration: duration !== undefined ? duration : state.duration,
    })),
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  togglePiP: () => set((state) => ({ isPiP: !state.isPiP })),

  setTelemetry: (stats) =>
    set((state) => ({
      currentResolution: stats.resolution ?? state.currentResolution,
      currentBitrateMbps: stats.bitrateMbps ?? state.currentBitrateMbps,
      bufferHealthSeconds: stats.bufferHealth ?? state.bufferHealthSeconds,
    })),

  setQualities: (qualities) => set({ qualities }),
  setSelectedQuality: (selectedQualityIndex) => set({ selectedQualityIndex }),
  setAudioTracks: (audioTracks) => set({ audioTracks }),
  setSelectedAudioTrack: (selectedAudioTrackIndex) => set({ selectedAudioTrackIndex }),
  setSubtitleTracks: (subtitleTracks) => set({ subtitleTracks }),
  setSelectedSubtitleTrack: (selectedSubtitleTrackIndex) => set({ selectedSubtitleTrackIndex }),

  toggleTerminalOverlay: () => set((state) => ({ showTerminalOverlay: !state.showTerminalOverlay })),
  addTerminalLog: (line) =>
    set((state) => ({
      terminalLogs: [...state.terminalLogs.slice(-20), line],
    })),
}));
