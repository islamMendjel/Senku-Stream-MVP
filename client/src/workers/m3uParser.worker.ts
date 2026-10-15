import {
  Category,
  LiveChannel,
  MovieItem,
  SeriesItem,
  SeriesEpisode,
} from '../../../shared/types.js';

interface WorkerInput {
  m3uContent: string;
}

export interface WorkerOutput {
  liveCategories: Category[];
  liveChannels: LiveChannel[];
  movieCategories: Category[];
  movies: MovieItem[];
  seriesCategories: Category[];
  series: SeriesItem[];
  seriesEpisodes: Record<string, SeriesEpisode[]>;
  totalCount: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { m3uContent } = e.data;
  const lines = m3uContent.split(/\r?\n/);
  const totalLines = lines.length;

  const liveCategoriesMap = new Map<string, string>();
  const movieCategoriesMap = new Map<string, string>();
  const seriesCategoriesMap = new Map<string, string>();

  const liveChannels: LiveChannel[] = [];
  const movies: MovieItem[] = [];
  const seriesMap = new Map<string, SeriesItem>();
  const seriesEpisodes: Record<string, SeriesEpisode[]> = {};

  let currentExtInf: {
    tvgId?: string;
    tvgName?: string;
    tvgLogo?: string;
    groupTitle?: string;
    rawTitle: string;
  } | null = null;

  let parsedEntriesCount = 0;
  const PROGRESS_INTERVAL = 2500;

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const tvgId = line.match(/tvg-id="([^"]*)"/i)?.[1];
      const tvgName = line.match(/tvg-name="([^"]*)"/i)?.[1];
      const tvgLogo = line.match(/tvg-logo="([^"]*)"/i)?.[1];
      const groupTitle = line.match(/group-title="([^"]*)"/i)?.[1] || 'Uncategorized';

      const commaIndex = line.lastIndexOf(',');
      const rawTitle = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Unnamed Stream';

      currentExtInf = {
        tvgId,
        tvgName,
        tvgLogo,
        groupTitle,
        rawTitle,
      };
      continue;
    }

    if (line.startsWith('#')) {
      // Other directive, ignore
      continue;
    }

    // This line is a Stream URL!
    if (currentExtInf) {
      const url = line;
      parsedEntriesCount++;

      const isMovie =
        url.includes('/movie/') ||
        /^(movies?|vod|film)/i.test(currentExtInf.groupTitle || '');

      const sxxExxMatch = currentExtInf.rawTitle.match(/s(\d{1,2})[\s._-]?e(\d{1,3})/i) ||
        currentExtInf.rawTitle.match(/season\s*(\d+).*episode\s*(\d+)/i);

      const isSeries = url.includes('/series/') || Boolean(sxxExxMatch);

      const groupName = currentExtInf.groupTitle || 'General';
      const categoryId = groupName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      if (isMovie && !isSeries) {
        movieCategoriesMap.set(categoryId, groupName);
        movies.push({
          stream_id: `m3u_movie_${parsedEntriesCount}`,
          name: currentExtInf.rawTitle,
          stream_icon: currentExtInf.tvgLogo,
          category_id: categoryId,
          url,
        });
      } else if (isSeries) {
        seriesCategoriesMap.set(categoryId, groupName);
        let seriesTitle = currentExtInf.rawTitle;
        let seasonNum = 1;
        let episodeNum = 1;

        if (sxxExxMatch) {
          seasonNum = parseInt(sxxExxMatch[1], 10);
          episodeNum = parseInt(sxxExxMatch[2], 10);
          seriesTitle = currentExtInf.rawTitle.substring(0, sxxExxMatch.index).trim();
        }

        const seriesId = seriesTitle.toLowerCase().replace(/[^a-z0-9]/g, '_') || `series_${parsedEntriesCount}`;

        if (!seriesMap.has(seriesId)) {
          seriesMap.set(seriesId, {
            series_id: seriesId,
            name: seriesTitle,
            cover: currentExtInf.tvgLogo,
            category_id: categoryId,
          });
          seriesEpisodes[seriesId] = [];
        }

        seriesEpisodes[seriesId].push({
          id: `ep_${parsedEntriesCount}`,
          episode_num: episodeNum,
          season: seasonNum,
          title: currentExtInf.rawTitle,
          container_extension: 'mp4',
          url,
        });
      } else {
        liveCategoriesMap.set(categoryId, groupName);
        liveChannels.push({
          stream_id: `m3u_live_${parsedEntriesCount}`,
          name: currentExtInf.rawTitle,
          stream_icon: currentExtInf.tvgLogo,
          category_id: categoryId,
          epg_channel_id: currentExtInf.tvgId,
          url,
        });
      }

      if (parsedEntriesCount % PROGRESS_INTERVAL === 0) {
        self.postMessage({
          type: 'progress',
          entriesParsed: parsedEntriesCount,
        });
      }

      currentExtInf = null;
    }
  }

  const liveCategories: Category[] = Array.from(liveCategoriesMap.entries()).map(([id, name]) => ({
    category_id: id,
    category_name: name,
    type: 'live',
  }));

  const movieCategories: Category[] = Array.from(movieCategoriesMap.entries()).map(([id, name]) => ({
    category_id: id,
    category_name: name,
    type: 'movie',
  }));

  const seriesCategories: Category[] = Array.from(seriesCategoriesMap.entries()).map(([id, name]) => ({
    category_id: id,
    category_name: name,
    type: 'series',
  }));

  const output: WorkerOutput = {
    liveCategories,
    liveChannels,
    movieCategories,
    movies,
    seriesCategories,
    series: Array.from(seriesMap.values()),
    seriesEpisodes,
    totalCount: parsedEntriesCount,
  };

  self.postMessage({
    type: 'complete',
    result: output,
  });
};
