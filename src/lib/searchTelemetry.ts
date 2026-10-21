import { ClassifiedSearchError } from "./searchCache";

export type SearchEventType =
  | "SEARCH_STARTED"
  | "SEARCH_SUCCESS"
  | "SEARCH_FAILED"
  | "SEARCH_CACHE_HIT"
  | "SEARCH_CIRCUIT_OPEN";

export interface SearchOperationalEvent {
  eventId: string;
  correlationId: string;
  eventType: SearchEventType;
  providerName: string;
  category: string;
  location: string;
  keywords?: string;
  durationMs?: number;
  resultCount?: number;
  errorCode?: string;
  errorMessage?: string;
  statusCode?: number;
  isCached?: boolean;
  isFallback?: boolean;
  isDemo?: boolean;
  timestamp: string;
}

export interface SearchOperationalMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  circuitOpenEvents: number;
  averageDurationMs: number;
  successRatePercent: number;
  circuitStatus: "CLOSED" | "OPEN";
  lastEventAt?: string;
  lastFailureAt?: string;
  recentEvents: SearchOperationalEvent[];
}

const MAX_LOG_RETENTION = 100;
const operationalEventsLog: SearchOperationalEvent[] = [];

/**
 * Generates a unique operational trace correlation ID for a search request lifecycle.
 */
export function generateSearchCorrelationId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `sch_${ts}_${rand}`;
}

/**
 * Sanitizes arbitrary log objects to ensure secrets, API keys, passwords,
 * and Bearer tokens are strictly redacted before logging.
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const forbiddenFields = [
    "apikey",
    "api_key",
    "secret",
    "password",
    "token",
    "authorization",
    "idtoken",
    "bearer"
  ];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenFields.some((f) => lowerKey.includes(f))) {
      cleanObj[key] = "[REDACTED_SECRET]";
    } else if (typeof val === "object" && val !== null) {
      cleanObj[key] = sanitizeLogData(val);
    } else if (typeof val === "string" && (val.includes("AIzaSy") || val.startsWith("Bearer "))) {
      cleanObj[key] = "[REDACTED_SECRET]";
    } else {
      cleanObj[key] = val;
    }
  }

  return cleanObj;
}

/**
 * Safely records a structured search operational event.
 * Fail-open design: Monitoring failures NEVER interrupt search execution.
 */
export function recordSearchOperationalEvent(
  eventInput: Partial<SearchOperationalEvent> & {
    correlationId: string;
    eventType: SearchEventType;
  }
): SearchOperationalEvent {
  try {
    const sanitized = sanitizeLogData(eventInput);
    const fullEvent: SearchOperationalEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      correlationId: sanitized.correlationId,
      eventType: sanitized.eventType,
      providerName: sanitized.providerName || "Google Search Grounding",
      category: sanitized.category || "Unspecified",
      location: sanitized.location || "Unspecified",
      keywords: sanitized.keywords || "",
      durationMs: typeof sanitized.durationMs === "number" ? Math.max(0, sanitized.durationMs) : undefined,
      resultCount: typeof sanitized.resultCount === "number" ? Math.max(0, sanitized.resultCount) : undefined,
      errorCode: sanitized.errorCode,
      errorMessage: sanitized.errorMessage,
      statusCode: sanitized.statusCode,
      isCached: !!sanitized.isCached,
      isFallback: !!sanitized.isFallback,
      isDemo: !!sanitized.isDemo,
      timestamp: sanitized.timestamp || new Date().toISOString()
    };

    operationalEventsLog.unshift(fullEvent);
    if (operationalEventsLog.length > MAX_LOG_RETENTION) {
      operationalEventsLog.pop();
    }

    return fullEvent;
  } catch (err) {
    // Fail-open guarantee: Log recording exception must never crash application code
    console.warn("[Search Telemetry] Failed to record operational event safely:", err);
    return {
      eventId: "evt_fallback_err",
      correlationId: eventInput.correlationId || "sch_unknown",
      eventType: eventInput.eventType,
      providerName: eventInput.providerName || "Unknown",
      category: eventInput.category || "",
      location: eventInput.location || "",
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Computes administrative operational health metrics for search provider performance.
 */
export function getSearchOperationalMetrics(isCircuitOpenStatus: boolean = false): SearchOperationalMetrics {
  const total = operationalEventsLog.length;
  let successCount = 0;
  let failureCount = 0;
  let cacheHitCount = 0;
  let circuitCount = 0;
  let totalDurationMs = 0;
  let durationSampleCount = 0;
  let lastFailureAt: string | undefined = undefined;

  for (const evt of operationalEventsLog) {
    if (evt.eventType === "SEARCH_SUCCESS") successCount++;
    if (evt.eventType === "SEARCH_FAILED") {
      failureCount++;
      if (!lastFailureAt) lastFailureAt = evt.timestamp;
    }
    if (evt.eventType === "SEARCH_CACHE_HIT") cacheHitCount++;
    if (evt.eventType === "SEARCH_CIRCUIT_OPEN") circuitCount++;

    if (typeof evt.durationMs === "number" && evt.durationMs > 0) {
      totalDurationMs += evt.durationMs;
      durationSampleCount++;
    }
  }

  const avgDuration = durationSampleCount > 0 ? Math.round(totalDurationMs / durationSampleCount) : 0;
  const attempted = successCount + failureCount;
  const successRate = attempted > 0 ? Math.round((successCount / attempted) * 100) : 100;

  return {
    totalRequests: total,
    successfulRequests: successCount,
    failedRequests: failureCount,
    cacheHits: cacheHitCount,
    circuitOpenEvents: circuitCount,
    averageDurationMs: avgDuration,
    successRatePercent: successRate,
    circuitStatus: isCircuitOpenStatus ? "OPEN" : "CLOSED",
    lastEventAt: operationalEventsLog[0]?.timestamp,
    lastFailureAt,
    recentEvents: [...operationalEventsLog.slice(0, 20)]
  };
}

/**
 * Clears search operational log buffer (for testing isolation).
 */
export function clearSearchOperationalLogs(): void {
  operationalEventsLog.length = 0;
}
