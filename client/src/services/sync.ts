import { parsePlaylistInput } from '../utils/urlParser.js';
import { XtreamClient } from './xtream.js';
import { CatalogDb } from './db.js';
import { PlaylistProfile, SyncProgressUpdate } from '../../../shared/types.js';
import type { WorkerOutput } from '../workers/m3uParser.worker.js';

export async function syncPlaylist(
  inputUrl: string,
  profileName?: string,
  appPassword?: string,
  onProgress?: (update: SyncProgressUpdate) => void
): Promise<PlaylistProfile> {
  const notify = (update: SyncProgressUpdate) => {
    if (onProgress) onProgress(update);
  };

  notify({ phase: 'init', message: 'Synthesizing dimensional coordinates...' });

  const parsed = parsePlaylistInput(inputUrl);
  const profileId = `prof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const effectiveName = profileName?.trim() || parsed.baseUrl.replace(/^https?:\/\//, '');

  let xtreamWorked = false;
  let xtreamProfile: PlaylistProfile | null = null;

  // Step 1: Try Xtream API first if username and password were detected
  if (parsed.isXtreamCompatible) {
    notify({
      phase: 'testing_xtream',
      message: 'Probing Xtream Codes gateway (player_api.php)...',
    });

    try {
      const xtream = new XtreamClient(
        {
          baseUrl: parsed.baseUrl,
          username: parsed.username,
          password: parsed.password,
        },
        appPassword
      );

      const authData = await xtream.authenticate();

      if (authData?.user_info) {
        const userInfo = authData.user_info;

        if (userInfo.status === 'Expired') {
          const expDate = userInfo.exp_date ? new Date(Number(userInfo.exp_date) * 1000).toLocaleDateString() : 'Unknown';
          throw new Error(`Dimension breach: Account expired on ${expDate}`);
        }

        if (userInfo.auth === 0) {
          throw new Error('Dimension breach: Invalid credentials (auth rejected)');
        }

        notify({
          phase: 'testing_xtream',
          message: `Authenticated as ${userInfo.username} [ Connections: ${userInfo.active_cons || 0}/${userInfo.max_connections || 1} ]`,
        });

        // Fetch categories and streams in parallel
        notify({ phase: 'indexing', message: 'Telemetry incoming: Fetching Live, VOD, and Series catalogs...' });

        const [
          liveCats,
          liveStreams,
          vodCats,
          vodStreams,
          seriesCats,
          seriesStreams,
        ] = await Promise.all([
          xtream.getLiveCategories().catch(() => []),
          xtream.getLiveStreams().catch(() => []),
          xtream.getVodCategories().catch(() => []),
          xtream.getVodStreams().catch(() => []),
          xtream.getSeriesCategories().catch(() => []),
          xtream.getSeries().catch(() => []),
        ]);

        notify({
          phase: 'indexing',
          message: `Indexing ${liveStreams.length} Live, ${vodStreams.length} Movies, ${seriesStreams.length} Series...`,
        });

        await CatalogDb.bulkSaveCatalog(profileId, {
          liveCategories: liveCats,
          liveChannels: liveStreams,
          movieCategories: vodCats,
          movies: vodStreams,
          seriesCategories: seriesCats,
          series: seriesStreams,
        });

        xtreamProfile = {
          id: profileId,
          name: effectiveName,
          url: inputUrl,
          baseUrl: parsed.baseUrl,
          username: parsed.username,
          password: parsed.password,
          type: 'xtream',
          lastSynced: Date.now(),
          autoRefresh12h: true,
          userInfo,
          serverInfo: authData.server_info,
        };

        await CatalogDb.saveProfile(xtreamProfile);
        xtreamWorked = true;

        notify({ phase: 'completed', message: 'Synthesis complete: Catalog indexed.' });
        return xtreamProfile;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Account expired') || errMsg.includes('Invalid credentials')) {
        notify({ phase: 'failed', message: errMsg, error: errMsg });
        throw err;
      }
      // Otherwise fall back to M3U downloading
      notify({
        phase: 'testing_xtream',
        message: `Xtream API handshake failed (${errMsg}). Activating M3U stream fallback...`,
      });
    }
  }

  // Step 2: Fall back to M3U playlist download & Web Worker parsing
  if (!xtreamWorked) {
    notify({
      phase: 'downloading_m3u',
      message: 'Downloading M3U playlist via proxy pipe...',
    });

    const m3uUrl = parsed.rawUrl;
    const proxyM3uEndpoint = `/api/m3u?url=${encodeURIComponent(m3uUrl)}`;

    const headers: Record<string, string> = {};
    if (appPassword) {
      headers['x-app-password'] = appPassword;
    }

    const response = await fetch(proxyM3uEndpoint, { headers });

    if (!response.ok) {
      throw new Error(`Dimension breach: Failed to download M3U playlist (HTTP ${response.status})`);
    }

    // Read with progress tracking
    const contentLength = Number(response.headers.get('content-length')) || 0;
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Dimension breach: Response body is unreadable');
    }

    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedBytes += value.length;

      const mbReceived = (receivedBytes / (1024 * 1024)).toFixed(1);
      const totalMb = contentLength ? ` / ${(contentLength / (1024 * 1024)).toFixed(1)} MB` : '';
      notify({
        phase: 'downloading_m3u',
        message: `Downloading ${mbReceived} MB${totalMb}...`,
        bytesReceived: receivedBytes,
        totalBytes: contentLength || undefined,
      });
    }

    // Decode full text
    notify({ phase: 'parsing_m3u', message: 'Decoding payload and spawning Web Worker...' });
    const fullBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    const m3uText = new TextDecoder('utf-8').decode(fullBuffer);

    if (!m3uText.includes('#EXTM3U')) {
      throw new Error('Dimension breach: Downloaded payload is not a valid M3U playlist');
    }

    // Spawn Web Worker for parsing without freezing the UI
    const workerOutput = await new Promise<WorkerOutput>((resolve, reject) => {
      const worker = new Worker(new URL('../workers/m3uParser.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          notify({
            phase: 'parsing_m3u',
            message: `Parsing ${e.data.entriesParsed.toLocaleString()} entries...`,
            entriesParsed: e.data.entriesParsed,
          });
        } else if (e.data.type === 'complete') {
          worker.terminate();
          resolve(e.data.result);
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(`Web Worker error: ${err.message}`));
      };

      worker.postMessage({ m3uContent: m3uText });
    });

    notify({
      phase: 'indexing',
      message: `Indexing ${workerOutput.totalCount.toLocaleString()} entries into IndexedDB...`,
    });

    await CatalogDb.bulkSaveCatalog(profileId, {
      liveCategories: workerOutput.liveCategories,
      liveChannels: workerOutput.liveChannels,
      movieCategories: workerOutput.movieCategories,
      movies: workerOutput.movies,
      seriesCategories: workerOutput.seriesCategories,
      series: workerOutput.series,
      seriesEpisodes: workerOutput.seriesEpisodes,
    });

    const m3uProfile: PlaylistProfile = {
      id: profileId,
      name: effectiveName,
      url: inputUrl,
      baseUrl: parsed.baseUrl,
      username: parsed.username || 'm3u_user',
      password: parsed.password || '',
      type: 'm3u',
      lastSynced: Date.now(),
      autoRefresh12h: true,
    };

    await CatalogDb.saveProfile(m3uProfile);
    notify({ phase: 'completed', message: 'Synthesis complete: All signals locked.' });
    return m3uProfile;
  }

  throw new Error('Dimension breach: Unable to synthesize catalog from supplied coordinates');
}
