/**
 * Rewrites HLS .m3u8 manifests so all variant streams, segments,
 * keys, and media tracks are routed through our proxy.
 */
export function rewriteM3u8(manifestContent: string, manifestBaseUrl: string, proxyEndpoint = '/api/stream'): string {
  const lines = manifestContent.split(/\r?\n/);
  const rewrittenLines: string[] = [];

  const resolveAndProxy = (relativeOrAbsoluteUri: string): string => {
    try {
      const resolved = new URL(relativeOrAbsoluteUri.trim(), manifestBaseUrl).toString();
      return `${proxyEndpoint}?url=${encodeURIComponent(resolved)}`;
    } catch {
      return relativeOrAbsoluteUri;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      rewrittenLines.push(line);
      continue;
    }

    // Rewrite tags containing URI="..." e.g. #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA
    if (trimmed.startsWith('#')) {
      if (
        trimmed.startsWith('#EXT-X-KEY:') ||
        trimmed.startsWith('#EXT-X-MAP:') ||
        trimmed.startsWith('#EXT-X-MEDIA:')
      ) {
        const rewrittenTag = trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
          return `URI="${resolveAndProxy(uri)}"`;
        });
        rewrittenLines.push(rewrittenTag);
      } else {
        rewrittenLines.push(line);
      }
      continue;
    }

    // Non-comment lines in an M3U8 are URIs (media playlists or segments)
    const proxiedUri = resolveAndProxy(trimmed);
    rewrittenLines.push(proxiedUri);
  }

  return rewrittenLines.join('\n');
}
