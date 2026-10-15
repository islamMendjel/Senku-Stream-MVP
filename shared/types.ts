// Shared Data Contracts between Server Proxy and Client App

export type StreamType = 'live' | 'movie' | 'series';

export interface XtreamUserInfo {
  username: string;
  password?: string;
  message?: string;
  auth: number;
  status: string;
  exp_date?: string | number | null;
  is_trial?: string | number;
  active_cons?: string | number;
  created_at?: string;
  max_connections?: string | number;
  allowed_output_formats?: string[];
}

export interface XtreamServerInfo {
  url?: string;
  port?: string | number;
  https_port?: string | number;
  server_protocol?: string;
  rtmp_port?: string | number;
  timezone?: string;
  timestamp_now?: number;
  time_now?: string;
}

export interface XtreamAuthResponse {
  user_info?: XtreamUserInfo;
  server_info?: XtreamServerInfo;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: number | string;
  type?: StreamType;
}

export interface LiveChannel {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number | string;
  stream_icon?: string;
  epg_channel_id?: string;
  added?: string;
  category_id: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
  tv_archive_duration?: number;
  // Computed or normalized fields
  url?: string;
  isFavorite?: boolean;
}

export interface MovieItem {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number | string;
  stream_icon?: string;
  rating?: string | number;
  rating_5based?: number;
  added?: string;
  category_id: string;
  container_extension?: string;
  custom_sid?: string;
  direct_source?: string;
  // Detail fields
  year?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  release_date?: string;
  duration_secs?: number;
  duration?: string;
  youtube_trailer?: string;
  url?: string;
  isFavorite?: boolean;
}

export interface SeriesItem {
  num?: number;
  name: string;
  series_id: number | string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: string;
  rating?: string | number;
  rating_5based?: number;
  backdrop_path?: string[];
  youtube_trailer?: string;
  episode_run_time?: string | number;
  category_id: string;
  isFavorite?: boolean;
}

export interface SeriesEpisode {
  id: string | number;
  episode_num: number | string;
  title: string;
  container_extension: string;
  info?: {
    duration_secs?: number;
    duration?: string;
    plot?: string;
    rating?: string | number;
    releasedate?: string;
    movie_image?: string;
  };
  season: number | string;
  url?: string;
}

export interface SeriesSeason {
  season_number: number;
  name?: string;
  episode_count?: number;
  overview?: string;
  air_date?: string;
  cover?: string;
}

export interface SeriesDetail {
  seasons: SeriesSeason[];
  info: Partial<SeriesItem>;
  episodes: Record<string, SeriesEpisode[]>; // key is season number
}

export interface EpgProgram {
  id: string;
  epg_id: string;
  title: string;
  lang?: string;
  start: string; // "2023-10-15 14:00:00"
  end: string;
  description: string;
  channel_id: string;
  start_timestamp: number;
  stop_timestamp: number;
  now_playing?: boolean;
  has_archive?: number;
}

export interface ShortEpgResponse {
  epg_listings?: EpgProgram[];
}

export interface ParsedM3uEntry {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  type: StreamType;
  seriesInfo?: {
    seriesName: string;
    season: number;
    episode: number;
  };
}

export interface PlaylistProfile {
  id: string;
  name: string;
  url: string;
  baseUrl: string;
  username: string;
  password?: string;
  type: 'xtream' | 'm3u';
  lastSynced: number;
  autoRefresh12h: boolean;
  userInfo?: XtreamUserInfo;
  serverInfo?: XtreamServerInfo;
}

export interface WatchHistoryItem {
  id: string; // channel_id or movie_id or episode_id
  type: StreamType;
  title: string;
  subtitle?: string; // e.g. "S01E03" or channel category
  poster?: string;
  lastPositionSeconds: number;
  durationSeconds: number;
  updatedAt: number;
  url: string;
}

export interface UserSettings {
  hideAdult: boolean;
  defaultPlayerQuality: 'auto' | '1080p' | '720p' | '480p';
  preferredStreamFormat: 'm3u8' | 'ts';
  bufferHealthTargetSec: number;
  audioLanguagePreference?: string;
  appPassword?: string;
  proxyUrl?: string; // default '/api'
}

export interface SyncProgressUpdate {
  phase: 'init' | 'testing_xtream' | 'downloading_m3u' | 'parsing_m3u' | 'indexing' | 'completed' | 'failed';
  message: string;
  bytesReceived?: number;
  totalBytes?: number;
  entriesParsed?: number;
  totalEntries?: number;
  error?: string;
}
