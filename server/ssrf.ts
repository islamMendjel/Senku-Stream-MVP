import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

/**
 * Validates a target URL against SSRF attacks.
 * Blocks private, loopback, link-local, carrier-grade NAT, and cloud metadata addresses.
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ safe: boolean; error?: string; url?: URL }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, error: 'Dimension breach: Invalid URL format' };
  }

  // Enforce HTTP / HTTPS protocols only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: 'Dimension breach: Protocol must be http or https' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit forbidden hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'local' ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return { safe: false, error: `Dimension breach: Blocked loopback/metadata host (${hostname})` };
  }

  try {
    // If hostname is already an IP, or resolve all records
    let ips: string[] = [];
    if (ipaddr.isValid(hostname)) {
      ips = [hostname];
    } else {
      const records = await dns.lookup(hostname, { all: true, verbatim: true });
      if (!records || records.length === 0) {
        return { safe: false, error: `Dimension breach: DNS resolution yielded null set for ${hostname}` };
      }
      ips = records.map((r) => r.address);
    }

    for (const ipStr of ips) {
      let addr = ipaddr.parse(ipStr);

      // Unmap IPv4-in-IPv6 (e.g. ::ffff:127.0.0.1)
      if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        addr = (addr as ipaddr.IPv6).toIPv4Address();
      }

      const range = addr.range();

      // Check against dangerous IP ranges
      const blockedRanges: string[] = [
        'loopback',        // 127.0.0.0/8, ::1
        'private',         // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
        'linkLocal',       // 169.254.0.0/16 (AWS metadata 169.254.169.254), fe80::/10
        'broadcast',       // 255.255.255.255/32
        'carrierGradeNat', // 100.64.0.0/10
        'multicast',       // 224.0.0.0/4, ff00::/8
        'reserved',
        'unspecified',     // 0.0.0.0, ::
      ];

      if (blockedRanges.includes(range)) {
        return { safe: false, error: `Dimension breach: Blocked private/reserved IP target [${ipStr}] (${range})` };
      }
    }

    return { safe: true, url: parsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { safe: false, error: `Dimension breach: DNS lookup error: ${message}` };
  }
}
