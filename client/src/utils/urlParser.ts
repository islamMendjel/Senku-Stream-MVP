export interface ParsedPlaylistUrl {
  baseUrl: string;
  username: string;
  password?: string;
  isXtreamCompatible: boolean;
  rawUrl: string;
}

/**
 * Parses an M3U or Xtream URL into host baseUrl, username, and password.
 * Supports:
 * - http://host:port/get.php?username=U&password=P&type=m3u_plus&output=m3u8
 * - http://host:port/player_api.php?username=U&password=P
 * - http://host:port/live/U/P/123.m3u8
 * - http://host:port/xmltv.php?username=U&password=P
 * - Standard M3U URLs without credentials
 */
export function parsePlaylistInput(input: string): ParsedPlaylistUrl {
  const trimmed = input.trim();
  let parsedUrl: URL;

  try {
    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `http://${trimmed}`;
    parsedUrl = new URL(withProto);
  } catch {
    throw new Error('Dimension breach: Malformed URL syntax');
  }

  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const searchParams = parsedUrl.searchParams;

  let username = searchParams.get('username') || searchParams.get('user') || '';
  let password = searchParams.get('password') || searchParams.get('pass') || '';

  // Check path segments e.g. /live/username/password/123.m3u8
  if (!username || !password) {
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (segments.length >= 3 && ['live', 'movie', 'series'].includes(segments[0])) {
      username = segments[1];
      password = segments[2];
    }
  }

  const isXtreamCompatible = Boolean(username && password);

  return {
    baseUrl,
    username,
    password,
    isXtreamCompatible,
    rawUrl: trimmed,
  };
}
