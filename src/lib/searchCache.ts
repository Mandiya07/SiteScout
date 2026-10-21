import { Business } from "../types";

export interface CachedSearchResult {
  businesses: Business[];
  groundingUrls?: string[];
  cachedAt: string;
  isCached: true;
  totalResults: number;
}

export interface ClassifiedSearchError {
  isTransient: boolean;
  errorCode: "SEARCH_TIMEOUT" | "RATE_LIMITED" | "AUTHENTICATION_ERROR" | "PROVIDER_OUTAGE" | "INVALID_QUERY" | "UNKNOWN_ERROR";
  statusCode: number;
  message: string;
  retryAfterSeconds?: number;
}

// In-Memory Short-Term Cache for Search Queries (TTL: 5 Minutes)
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCacheStore = new Map<string, { result: CachedSearchResult; expiresAt: number }>();

// In-flight Single-Flight Coalescer Map
const inFlightRequests = new Map<string, Promise<any>>();

// Circuit Breaker State
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30 * 1000; // 30 seconds

/**
 * Builds a deterministic cache key for a search query.
 */
export function buildSearchCacheKey(params: {
  city?: string;
  category?: string;
  country?: string;
  keywords?: string;
  page?: number;
}): string {
  const norm = (str?: string) => (str || "").trim().toLowerCase();
  return `${norm(params.country)}:${norm(params.city)}:${norm(params.category)}:${norm(params.keywords)}:p${params.page || 1}`;
}

/**
 * Retrieves cached search results if valid and not expired.
 */
export function getCachedSearchResults(cacheKey: string): CachedSearchResult | null {
  const entry = searchCacheStore.get(cacheKey);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    searchCacheStore.delete(cacheKey);
    return null;
  }

  return entry.result;
}

/**
 * Stores search results in short-term cache.
 */
export function setCachedSearchResults(
  cacheKey: string,
  businesses: Business[],
  groundingUrls?: string[]
): void {
  const result: CachedSearchResult = {
    businesses,
    groundingUrls,
    cachedAt: new Date().toISOString(),
    isCached: true,
    totalResults: businesses.length
  };

  searchCacheStore.set(cacheKey, {
    result,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS
  });
}

/**
 * Clears search cache (for testing or manual refresh).
 */
export function clearSearchCache(): void {
  searchCacheStore.clear();
  inFlightRequests.clear();
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

/**
 * Single-flight request coalescer. Ensures identical concurrent search requests
 * reuse a single underlying provider promise.
 */
export async function coalesceSearchRequest<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  if (inFlightRequests.has(cacheKey)) {
    console.log(`[Search Coalescer] Deduplicating in-flight search request for key: ${cacheKey}`);
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const promise = fetchFn().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Circuit Breaker Status Check
 */
export function isCircuitOpen(): boolean {
  if (Date.now() < circuitOpenUntil) {
    return true;
  }
  return false;
}

/**
 * Records provider success or failure for circuit breaker monitoring.
 */
export function recordProviderOutcome(success: boolean, isTransientError: boolean = false): void {
  if (success) {
    consecutiveFailures = 0;
    circuitOpenUntil = 0;
  } else if (isTransientError) {
    consecutiveFailures++;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      console.warn(`[Circuit Breaker] Search provider failure threshold reached (${consecutiveFailures}). Circuit OPEN until ${new Date(circuitOpenUntil).toISOString()}`);
    }
  }
}

/**
 * Classifies error objects into actionable status codes and standard error types.
 */
export function classifySearchError(error: any): ClassifiedSearchError {
  const status = error?.status || error?.code || error?.response?.status;
  const messageStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));

  if (messageStr.includes("timed out") || messageStr.includes("ETIMEDOUT") || messageStr.includes("Live directory search timed out")) {
    return {
      isTransient: true,
      errorCode: "SEARCH_TIMEOUT",
      statusCode: 504,
      message: "The search query timed out. The provider took too long to respond. Please try again."
    };
  }

  if (status === 429 || messageStr.includes("429") || messageStr.includes("Quota exceeded") || messageStr.includes("RESOURCE_EXHAUSTED")) {
    return {
      isTransient: true,
      errorCode: "RATE_LIMITED",
      statusCode: 429,
      message: "Search provider rate limit or quota exceeded. Please wait a moment before searching again.",
      retryAfterSeconds: 30
    };
  }

  if (status === 401 || status === 403 || messageStr.includes("401") || messageStr.includes("403") || messageStr.includes("API_KEY_INVALID")) {
    return {
      isTransient: false,
      errorCode: "AUTHENTICATION_ERROR",
      statusCode: status === 401 ? 401 : 403,
      message: "Search provider authentication or permission failure. Please check API key configuration."
    };
  }

  if (status === 400 || messageStr.includes("400") || messageStr.includes("INVALID_ARGUMENT")) {
    return {
      isTransient: false,
      errorCode: "INVALID_QUERY",
      statusCode: 400,
      message: "Invalid search parameters supplied. Please adjust your category or location filters."
    };
  }

  if (status === 503 || status === 500 || status === 502 || messageStr.includes("503") || messageStr.includes("500") || messageStr.includes("UNAVAILABLE") || messageStr.includes("overloaded")) {
    return {
      isTransient: true,
      errorCode: "PROVIDER_OUTAGE",
      statusCode: status || 503,
      message: "Search provider is temporarily unavailable or overloaded. Please try again in a few moments."
    };
  }

  return {
    isTransient: true,
    errorCode: "UNKNOWN_ERROR",
    statusCode: 500,
    message: error?.message || "An unexpected error occurred while searching for businesses."
  };
}
