import {
  XtreamAuthResponse,
  Category,
  LiveChannel,
  MovieItem,
  SeriesItem,
  SeriesDetail,
  ShortEpgResponse,
  PlaylistProfile,
} from '../../../shared/types.js';

export class XtreamClient {
  private baseUrl: string;
  private username: string;
  private password?: string;
  private proxyPrefix: string;
  private appPassword?: string;

  constructor(profile: Pick<PlaylistProfile, 'baseUrl' | 'username' | 'password'>, appPassword?: string, proxyPrefix = '/api') {
    this.baseUrl = profile.baseUrl;
    this.username = profile.username;
    this.password = profile.password;
    this.proxyPrefix = proxyPrefix;
    this.appPassword = appPassword;
  }

  private async request<T>(action?: string, extraParams: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(`${this.proxyPrefix}/xtream`, window.location.origin);
    url.searchParams.set('base', this.baseUrl);
    url.searchParams.set('username', this.username);
    if (this.password) {
      url.searchParams.set('password', this.password);
    }
    if (action) {
      url.searchParams.set('action', action);
    }

    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = {};
    if (this.appPassword) {
      headers['x-app-password'] = this.appPassword;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      let errText = '';
      try {
        const json = await res.json();
        errText = json.error || JSON.stringify(json);
      } catch {
        errText = await res.text();
      }
      throw new Error(errText || `Xtream API error ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Authenticate / fetch account details
   */
  async authenticate(): Promise<XtreamAuthResponse> {
    return this.request<XtreamAuthResponse>();
  }

  /**
   * Live TV Categories & Streams
   */
  async getLiveCategories(): Promise<Category[]> {
    return this.request<Category[]>('get_live_categories');
  }

  async getLiveStreams(categoryId?: string): Promise<LiveChannel[]> {
    return this.request<LiveChannel[]>('get_live_streams', categoryId ? { category_id: categoryId } : {});
  }

  /**
   * VOD / Movies Categories & Streams & Info
   */
  async getVodCategories(): Promise<Category[]> {
    return this.request<Category[]>('get_vod_categories');
  }

  async getVodStreams(categoryId?: string): Promise<MovieItem[]> {
    return this.request<MovieItem[]>('get_vod_streams', categoryId ? { category_id: categoryId } : {});
  }

  async getVodInfo(vodId: string | number): Promise<any> {
    return this.request<any>('get_vod_info', { vod_id: vodId });
  }

  /**
   * Series Categories & List & Detail (Seasons + Episodes)
   */
  async getSeriesCategories(): Promise<Category[]> {
    return this.request<Category[]>('get_series_categories');
  }

  async getSeries(categoryId?: string): Promise<SeriesItem[]> {
    return this.request<SeriesItem[]>('get_series', categoryId ? { category_id: categoryId } : {});
  }

  async getSeriesInfo(seriesId: string | number): Promise<SeriesDetail> {
    return this.request<SeriesDetail>('get_series_info', { series_id: seriesId });
  }

  /**
   * EPG Program Listings
   */
  async getShortEpg(streamId: string | number, limit = 4): Promise<ShortEpgResponse> {
    return this.request<ShortEpgResponse>('get_short_epg', {
      stream_id: streamId,
      limit,
    });
  }

  /**
   * Generate proxied playback URL
   */
  buildLiveStreamUrl(streamId: string | number, format: 'm3u8' | 'ts' = 'm3u8'): string {
    const rawUrl = `${this.baseUrl}/live/${this.username}/${this.password}/${streamId}.${format}`;
    return `${this.proxyPrefix}/stream?url=${encodeURIComponent(rawUrl)}`;
  }

  buildMovieStreamUrl(streamId: string | number, extension = 'mp4'): string {
    const rawUrl = `${this.baseUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
    return `${this.proxyPrefix}/stream?url=${encodeURIComponent(rawUrl)}`;
  }

  buildEpisodeStreamUrl(episodeId: string | number, extension = 'mp4'): string {
    const rawUrl = `${this.baseUrl}/series/${this.username}/${this.password}/${episodeId}.${extension}`;
    return `${this.proxyPrefix}/stream?url=${encodeURIComponent(rawUrl)}`;
  }
}
