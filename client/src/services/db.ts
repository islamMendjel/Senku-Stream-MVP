import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  PlaylistProfile,
  Category,
  LiveChannel,
  MovieItem,
  SeriesItem,
  SeriesEpisode,
  EpgProgram,
} from '../../../shared/types.js';

interface SenkuDBSchema extends DBSchema {
  profiles: {
    key: string;
    value: PlaylistProfile;
    indexes: { 'by-synced': number };
  };
  categories: {
    key: string; // `${profileId}_${type}_${categoryId}`
    value: Category & { profileId: string; type: string };
    indexes: { 'by-profile-type': [string, string] };
  };
  live_channels: {
    key: string; // `${profileId}_${stream_id}`
    value: LiveChannel & { profileId: string };
    indexes: {
      'by-profile': string;
      'by-profile-category': [string, string];
      'by-name': string;
    };
  };
  movies: {
    key: string; // `${profileId}_${stream_id}`
    value: MovieItem & { profileId: string };
    indexes: {
      'by-profile': string;
      'by-profile-category': [string, string];
      'by-name': string;
    };
  };
  series: {
    key: string; // `${profileId}_${series_id}`
    value: SeriesItem & { profileId: string };
    indexes: {
      'by-profile': string;
      'by-profile-category': [string, string];
      'by-name': string;
    };
  };
  series_episodes: {
    key: string; // `${profileId}_${series_id}_${episodeId}`
    value: SeriesEpisode & { profileId: string; seriesId: string };
    indexes: {
      'by-series': [string, string]; // [profileId, seriesId]
    };
  };
  epg_cache: {
    key: string; // `${profileId}_${channelId}`
    value: {
      profileId: string;
      channelId: string;
      programs: EpgProgram[];
      cachedAt: number;
    };
    indexes: { 'by-cached': number };
  };
}

const DB_NAME = 'senku_iptv_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SenkuDBSchema>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<SenkuDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<SenkuDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Profiles store
        if (!db.objectStoreNames.contains('profiles')) {
          const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
          profileStore.createIndex('by-synced', 'lastSynced');
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' as any });
          catStore.createIndex('by-profile-type', ['profileId', 'type']);
        }

        // Live Channels store
        if (!db.objectStoreNames.contains('live_channels')) {
          const liveStore = db.createObjectStore('live_channels', { keyPath: 'id' as any });
          liveStore.createIndex('by-profile', 'profileId');
          liveStore.createIndex('by-profile-category', ['profileId', 'category_id']);
          liveStore.createIndex('by-name', 'name');
        }

        // Movies store
        if (!db.objectStoreNames.contains('movies')) {
          const movieStore = db.createObjectStore('movies', { keyPath: 'id' as any });
          movieStore.createIndex('by-profile', 'profileId');
          movieStore.createIndex('by-profile-category', ['profileId', 'category_id']);
          movieStore.createIndex('by-name', 'name');
        }

        // Series store
        if (!db.objectStoreNames.contains('series')) {
          const seriesStore = db.createObjectStore('series', { keyPath: 'id' as any });
          seriesStore.createIndex('by-profile', 'profileId');
          seriesStore.createIndex('by-profile-category', ['profileId', 'category_id']);
          seriesStore.createIndex('by-name', 'name');
        }

        // Series episodes store
        if (!db.objectStoreNames.contains('series_episodes')) {
          const epStore = db.createObjectStore('series_episodes', { keyPath: 'id' as any });
          epStore.createIndex('by-series', ['profileId', 'seriesId']);
        }

        // EPG cache store
        if (!db.objectStoreNames.contains('epg_cache')) {
          const epgStore = db.createObjectStore('epg_cache', { keyPath: 'id' as any });
          epgStore.createIndex('by-cached', 'cachedAt');
        }
      },
    });
  }
  return dbPromise;
}

export const CatalogDb = {
  // Profiles
  async saveProfile(profile: PlaylistProfile): Promise<void> {
    const db = await getDatabase();
    await db.put('profiles', profile);
  },

  async getProfile(id: string): Promise<PlaylistProfile | undefined> {
    const db = await getDatabase();
    return db.get('profiles', id);
  },

  async getAllProfiles(): Promise<PlaylistProfile[]> {
    const db = await getDatabase();
    return db.getAll('profiles');
  },

  async deleteProfile(profileId: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('profiles', profileId);
    await CatalogDb.clearProfileCatalog(profileId);
  },

  // Bulk save catalog for 20,000+ items smoothly
  async bulkSaveCatalog(
    profileId: string,
    data: {
      liveCategories: Category[];
      liveChannels: LiveChannel[];
      movieCategories: Category[];
      movies: MovieItem[];
      seriesCategories: Category[];
      series: SeriesItem[];
      seriesEpisodes?: Record<string, SeriesEpisode[]>;
    }
  ): Promise<void> {
    const db = await getDatabase();

    // 1. Categories
    const catTx = db.transaction('categories', 'readwrite');
    for (const cat of data.liveCategories) {
      await catTx.store.put({
        ...cat,
        id: `${profileId}_live_${cat.category_id}`,
        profileId,
        type: 'live',
      } as any);
    }
    for (const cat of data.movieCategories) {
      await catTx.store.put({
        ...cat,
        id: `${profileId}_movie_${cat.category_id}`,
        profileId,
        type: 'movie',
      } as any);
    }
    for (const cat of data.seriesCategories) {
      await catTx.store.put({
        ...cat,
        id: `${profileId}_series_${cat.category_id}`,
        profileId,
        type: 'series',
      } as any);
    }
    await catTx.done;

    // 2. Live channels (batched)
    const liveTx = db.transaction('live_channels', 'readwrite');
    for (const channel of data.liveChannels) {
      await liveTx.store.put({
        ...channel,
        id: `${profileId}_${channel.stream_id}`,
        profileId,
      } as any);
    }
    await liveTx.done;

    // 3. Movies
    const movieTx = db.transaction('movies', 'readwrite');
    for (const movie of data.movies) {
      await movieTx.store.put({
        ...movie,
        id: `${profileId}_${movie.stream_id}`,
        profileId,
      } as any);
    }
    await movieTx.done;

    // 4. Series
    const seriesTx = db.transaction('series', 'readwrite');
    for (const s of data.series) {
      await seriesTx.store.put({
        ...s,
        id: `${profileId}_${s.series_id}`,
        profileId,
      } as any);
    }
    await seriesTx.done;

    // 5. Episodes if present
    if (data.seriesEpisodes) {
      const epTx = db.transaction('series_episodes', 'readwrite');
      for (const [seriesId, episodes] of Object.entries(data.seriesEpisodes)) {
        for (const ep of episodes) {
          await epTx.store.put({
            ...ep,
            id: `${profileId}_${seriesId}_${ep.id}`,
            profileId,
            seriesId,
          } as any);
        }
      }
      await epTx.done;
    }
  },

  async getCategories(profileId: string, type: 'live' | 'movie' | 'series'): Promise<Category[]> {
    const db = await getDatabase();
    const all = await db.getAllFromIndex('categories', 'by-profile-type', [profileId, type]);
    return all.map((c) => ({
      category_id: c.category_id,
      category_name: c.category_name,
      type: c.type as any,
    }));
  },

  async getLiveChannels(profileId: string, categoryId?: string): Promise<LiveChannel[]> {
    const db = await getDatabase();
    if (categoryId && categoryId !== 'all') {
      return db.getAllFromIndex('live_channels', 'by-profile-category', [profileId, categoryId]);
    }
    return db.getAllFromIndex('live_channels', 'by-profile', profileId);
  },

  async getMovies(profileId: string, categoryId?: string): Promise<MovieItem[]> {
    const db = await getDatabase();
    if (categoryId && categoryId !== 'all') {
      return db.getAllFromIndex('movies', 'by-profile-category', [profileId, categoryId]);
    }
    return db.getAllFromIndex('movies', 'by-profile', profileId);
  },

  async getSeries(profileId: string, categoryId?: string): Promise<SeriesItem[]> {
    const db = await getDatabase();
    if (categoryId && categoryId !== 'all') {
      return db.getAllFromIndex('series', 'by-profile-category', [profileId, categoryId]);
    }
    return db.getAllFromIndex('series', 'by-profile', profileId);
  },

  async getSeriesEpisodes(profileId: string, seriesId: string): Promise<SeriesEpisode[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('series_episodes', 'by-series', [profileId, seriesId]);
  },

  async clearProfileCatalog(profileId: string): Promise<void> {
    const db = await getDatabase();
    const stores: ('categories' | 'live_channels' | 'movies' | 'series' | 'series_episodes')[] = [
      'categories',
      'live_channels',
      'movies',
      'series',
      'series_episodes',
    ];

    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      let cursor = await tx.store.openCursor();
      while (cursor) {
        if ((cursor.value as any).profileId === profileId) {
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }
      await tx.done;
    }
  },

  async clearAllData(): Promise<void> {
    const db = await getDatabase();
    await db.clear('profiles');
    await db.clear('categories');
    await db.clear('live_channels');
    await db.clear('movies');
    await db.clear('series');
    await db.clear('series_episodes');
    await db.clear('epg_cache');
  },
};
