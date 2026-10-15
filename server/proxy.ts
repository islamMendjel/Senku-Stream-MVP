import { Router, Request, Response, NextFunction } from 'express';
import { validateSafeUrl } from './ssrf.js';
import { rewriteM3u8 } from './m3u8Rewriter.js';

export const proxyRouter = Router();

const DEFAULT_TIMEOUT_MS = 15000;
const VLC_USER_AGENT = 'VLC/3.0.18 LibVLC/3.0.18';

// Authentication middleware if APP_PASSWORD is set in environment
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    return next();
  }

  const providedKey =
    req.headers['x-app-password'] ||
    req.query.key ||
    (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));

  if (providedKey === appPassword) {
    return next();
  }

  res.status(401).json({
    error: 'Dimension breach: Authentication key rejected or missing',
    code: 'AUTH_REQUIRED',
  });
}

proxyRouter.use(authMiddleware);

/**
 * Robust fetch wrapper with SSRF validation on initial URL and on all redirects,
 * custom VLC User-Agent, and a 15-second timeout.
 */
async function safeFetchWithRedirects(
  initialUrl: string,
  options: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    method?: string;
  } = {},
  maxRedirects = 5
): Promise<{ response: globalThis.Response; finalUrl: string }> {
  let currentUrl = initialUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const safeCheck = await validateSafeUrl(currentUrl);
    if (!safeCheck.safe) {
      throw new Error(safeCheck.error || 'Blocked by SSRF guard');
    }

    const headers: Record<string, string> = {
      'User-Agent': VLC_USER_AGENT,
      Accept: '*/*',
      Connection: 'keep-alive',
      ...(options.headers || {}),
    };

    const res = await fetch(currentUrl, {
      method: options.method || 'GET',
      headers,
      redirect: 'manual',
      signal: options.signal,
    });

    // Check for HTTP redirect status codes
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) {
        return { response: res, finalUrl: currentUrl };
      }

      currentUrl = new URL(location, currentUrl).toString();
      redirectsCount++;
      continue;
    }

    return { response: res, finalUrl: currentUrl };
  }

  throw new Error('Dimension breach: Exceeded maximum redirect limit (5)');
}

/**
 * GET /api/health
 */
proxyRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: Date.now(),
    authProtected: Boolean(process.env.APP_PASSWORD),
  });
});

/**
 * GET /api/xtream
 * Forwards to Xtream Codes player_api.php with proper query params
 */
proxyRouter.get('/xtream', async (req: Request, res: Response) => {
  const { base, username, password, action, ...restParams } = req.query;

  if (!base || typeof base !== 'string' || !username || !password) {
    res.status(400).json({
      error: 'Dimension breach: Missing base, username, or password parameter',
    });
    return;
  }

  // Construct target URL
  let cleanBase = base.trim().replace(/\/+$/, '');
  if (!cleanBase.startsWith('http://') && !cleanBase.startsWith('https://')) {
    cleanBase = `http://${cleanBase}`;
  }

  const targetUrl = new URL(`${cleanBase}/player_api.php`);
  targetUrl.searchParams.set('username', String(username));
  targetUrl.searchParams.set('password', String(password));

  if (action && typeof action === 'string') {
    targetUrl.searchParams.set('action', action);
  }

  for (const [key, value] of Object.entries(restParams)) {
    if (value !== undefined && key !== 'key') {
      targetUrl.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  req.on('close', () => controller.abort());

  try {
    const { response } = await safeFetchWithRedirects(targetUrl.toString(), {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || 'application/json';
    res.status(response.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const text = await response.text();
    res.send(text);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      error: `Dimension breach: Xtream API upstream unreachable: ${message}`,
    });
  }
});

/**
 * GET /api/m3u
 * Streams M3U playlist file directly with chunked transfer
 */
proxyRouter.get('/m3u', async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Dimension breach: Missing M3U url parameter' });
    return;
  }

  const controller = new AbortController();
  // 60-second timeout for large playlists (100MB+)
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  req.on('close', () => controller.abort());

  try {
    const { response } = await safeFetchWithRedirects(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      res.status(response.status).json({
        error: `Dimension breach: Upstream returned HTTP ${response.status}`,
      });
      return;
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const ok = res.write(Buffer.from(value));
          if (!ok) {
            await new Promise((resolve) => res.once('drain', resolve));
          }
        }
        res.end();
      } catch (streamErr) {
        res.destroy(streamErr instanceof Error ? streamErr : new Error(String(streamErr)));
      }
    };

    await pump();
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) {
      res.status(502).json({
        error: `Dimension breach: M3U download failed: ${message}`,
      });
    }
  }
});

/**
 * GET /api/stream
 * Pipes video streams with Range request support and rewrites HLS .m3u8 manifests
 */
proxyRouter.get('/stream', async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Dimension breach: Missing stream url parameter' });
    return;
  }

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  // Forward Range header from client if present
  const clientRange = req.headers.range;
  const forwardHeaders: Record<string, string> = {};
  if (clientRange) {
    forwardHeaders['Range'] = clientRange;
  }

  try {
    const { response, finalUrl } = await safeFetchWithRedirects(url, {
      headers: forwardHeaders,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isM3u8 =
      url.toLowerCase().includes('.m3u8') ||
      finalUrl.toLowerCase().includes('.m3u8') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl');

    // Handle HLS Manifest Rewriting
    if (isM3u8) {
      const manifestText = await response.text();
      const rewritten = rewriteM3u8(manifestText, finalUrl, '/api/stream');

      res.status(200);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(rewritten);
      return;
    }

    // Pass through status code (200 or 206 Partial Content)
    res.status(response.status);

    // Forward essential media headers
    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ];

    for (const h of headersToForward) {
      const val = response.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    if (!response.body) {
      res.end();
      return;
    }

    // Pipe stream directly to client
    const reader = response.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const ok = res.write(Buffer.from(value));
          if (!ok) {
            await new Promise((resolve) => res.once('drain', resolve));
          }
        }
        res.end();
      } catch (streamErr) {
        // Client aborted connection or upstream closed
        res.destroy(streamErr instanceof Error ? streamErr : new Error(String(streamErr)));
      }
    };

    await pump();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) {
      res.status(502).json({
        error: `Dimension breach: Media stream pipe failure: ${message}`,
      });
    }
  }
});
