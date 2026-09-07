import net from "net";
import dns from "dns";

/**
 * Checks if an IPv4 address falls within private, loopback, link-local, multicast,
 * or reserved special-purpose IP ranges (including cloud metadata services).
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 string treated as restricted
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 (Default / Current network)
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback addresses)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private network: 172.16.0.0 – 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Instance Metadata e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments) & 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && b >= 18 && b <= 19) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address falls within private, loopback, link-local, multicast,
 * or IPv4-mapped IPv6 ranges.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback / Unspecified IPv6 addresses
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized === "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }

  // IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1)
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.substring(7);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
    return true; // Non-standard or hex IPv4 mapped string
  }

  // Unique Local Address (fc00::/7 -> fc.. or fd..)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // Link-Local Address (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(normalized)) {
    return true;
  }

  // Multicast Address (ff00::/8)
  if (normalized.startsWith("ff")) {
    return true;
  }

  return false;
}

/**
 * Validates whether an IP address (IPv4 or IPv6) is restricted or private.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  } else if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return true; // Treat unrecognized IP formats as restricted
}

/**
 * Checks domain name syntax and forbids internal names/suffixes like localhost, .local, .internal.
 */
export function validateHostname(hostname: string): { valid: boolean; error?: string } {
  if (!hostname || typeof hostname !== "string") {
    return { valid: false, error: "Empty or invalid hostname." };
  }

  const lowerHost = hostname.toLowerCase().trim();

  // Remove enclosing brackets for IPv6 literals if present
  const cleanHost =
    lowerHost.startsWith("[") && lowerHost.endsWith("]")
      ? lowerHost.slice(1, -1)
      : lowerHost;

  const forbiddenSuffixes = [
    "localhost",
    ".localhost",
    ".local",
    ".internal",
    ".lan",
    ".home",
    ".invalid",
    ".onion",
    ".example",
    ".test",
  ];

  if (
    cleanHost === "localhost" ||
    forbiddenSuffixes.some((suffix) => cleanHost.endsWith(suffix))
  ) {
    return { valid: false, error: "Access to internal or local hostnames is prohibited." };
  }

  // If host is a direct IP address literal
  if (net.isIP(cleanHost)) {
    if (isPrivateIp(cleanHost)) {
      return { valid: false, error: "Access to private or restricted IP addresses is prohibited." };
    }
  }

  return { valid: true };
}

/**
 * Performs full SSRF validation on a candidate URL string, verifying scheme, hostname,
 * and performing a DNS lookup to check all resolved target IPs against private IP ranges.
 */
export async function validateUrlForSsrf(
  targetUrl: string
): Promise<{ safe: boolean; url?: URL; error?: string }> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    return { safe: false, error: "Invalid URL format." };
  }

  // Protocol restriction: strictly http: or https:
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      safe: false,
      error: `Forbidden scheme '${parsedUrl.protocol}'. Only HTTP and HTTPS protocols are permitted.`,
    };
  }

  // Hostname validation
  const hostVal = validateHostname(parsedUrl.hostname);
  if (!hostVal.valid) {
    return { safe: false, error: hostVal.error };
  }

  // Port validation: check valid port bounds
  const port = parsedUrl.port
    ? parseInt(parsedUrl.port, 10)
    : parsedUrl.protocol === "https:"
    ? 443
    : 80;

  if (isNaN(port) || port < 1 || port > 65535) {
    return { safe: false, error: "Invalid port number." };
  }

  // DNS Resolution check (resolves hostname to all A and AAAA records)
  try {
    const addresses = await dns.promises.lookup(parsedUrl.hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, error: "Failed to resolve domain DNS." };
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        return {
          safe: false,
          error: `Security Alert: Domain resolves to private/internal IP address (${record.address}). Access blocked.`,
        };
      }
    }
  } catch (err: any) {
    return { safe: false, error: `DNS lookup failed for host '${parsedUrl.hostname}': ${err.message || err}` };
  }

  return { safe: true, url: parsedUrl };
}

/**
 * Reads a response body stream safely, capping the total bytes read to maxBytes
 * to prevent DoS attacks via huge files or decompression bombs.
 */
export async function readResponseBodyWithLimit(
  response: Response,
  maxBytes: number = 2 * 1024 * 1024
): Promise<string> {
  if (!response.body) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  if (typeof (response.body as any).getReader === "function") {
    const reader = (response.body as any).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          const needed = maxBytes - (totalBytes - value.byteLength);
          if (needed > 0) chunks.push(value.slice(0, needed));
          break;
        }
        chunks.push(value);
      }
    }
  } else if (Symbol.asyncIterator in (response.body as any)) {
    for await (const chunk of response.body as any) {
      const u8 = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk);
      totalBytes += u8.byteLength;
      if (totalBytes > maxBytes) {
        const needed = maxBytes - (totalBytes - u8.byteLength);
        if (needed > 0) chunks.push(u8.slice(0, needed));
        break;
      }
      chunks.push(u8);
    }
  }

  const combined = new Uint8Array(Math.min(totalBytes, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder("utf-8").decode(combined);
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  finalUrl: string;
  html: string;
  error?: string;
}

/**
 * Safely fetches a URL with full SSRF protections:
 * - Scheme & Hostname validation
 * - DNS lookup and private IP blocking
 * - Manual redirect validation (re-running SSRF checks on each redirect)
 * - Strict timeout with AbortController
 * - Response body size limiting
 */
export async function safeFetchUrl(
  initialUrl: string,
  options: {
    maxRedirects?: number;
    timeoutMs?: number;
    maxResponseBodyBytes?: number;
  } = {}
): Promise<SafeFetchResult> {
  const { maxRedirects = 3, timeoutMs = 5000, maxResponseBodyBytes = 2 * 1024 * 1024 } = options;

  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const ssrfCheck = await validateUrlForSsrf(currentUrl);
    if (!ssrfCheck.safe || !ssrfCheck.url) {
      return {
        ok: false,
        status: 403,
        statusText: "Forbidden",
        finalUrl: currentUrl,
        html: "",
        error: ssrfCheck.error || "SSRF validation failed.",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(ssrfCheck.url.toString(), {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeoutId);

      // Handle HTTP Redirects manually with SSRF checks on redirect targets
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get("location");
        if (!locationHeader) {
          return {
            ok: false,
            status: response.status,
            statusText: response.statusText || "Redirect without Location header",
            finalUrl: currentUrl,
            html: "",
            error: "Redirect response missing Location header.",
          };
        }

        redirectCount++;
        if (redirectCount > maxRedirects) {
          return {
            ok: false,
            status: 508,
            statusText: "Loop Detected",
            finalUrl: currentUrl,
            html: "",
            error: `Exceeded maximum redirect limit (${maxRedirects}).`,
          };
        }

        // Resolve relative redirect against current base URL
        try {
          const nextUrl = new URL(locationHeader, currentUrl).toString();
          currentUrl = nextUrl;
          continue; // Loop back to validate nextUrl and fetch
        } catch (e) {
          return {
            ok: false,
            status: 400,
            statusText: "Bad Request",
            finalUrl: currentUrl,
            html: "",
            error: "Invalid redirect Location header format.",
          };
        }
      }

      // Read response body safely with byte limit
      const html = await readResponseBodyWithLimit(response, maxResponseBodyBytes);

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText || (response.ok ? "OK" : "Error"),
        finalUrl: currentUrl,
        html,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      return {
        ok: false,
        status: isAbort ? 408 : 502,
        statusText: isAbort ? "Request Timeout" : "Bad Gateway",
        finalUrl: currentUrl,
        html: "",
        error: isAbort
          ? `Request timed out after ${timeoutMs}ms.`
          : `Network error reaching target: ${err.message || err}`,
      };
    }
  }

  return {
    ok: false,
    status: 508,
    statusText: "Loop Detected",
    finalUrl: currentUrl,
    html: "",
    error: "Exceeded maximum redirect limit.",
  };
}
