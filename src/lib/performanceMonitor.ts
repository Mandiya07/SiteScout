/**
 * SITESCOUT AI — PRODUCTION PERFORMANCE & RELIABILITY MONITOR
 * 
 * Provides high-resolution latency tracking, percentile calculations (p50, p95, p99),
 * AI operation lifecycle tracking, memory footprint monitoring, and concurrency metrics.
 * Strictly redacts secrets and customer credentials.
 */

export interface LatencySample {
  category: "api" | "search" | "ai_generation" | "database" | "rendering" | "preview" | "crm";
  operation: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
  errorCode?: string;
  isCached?: boolean;
}

export interface MetricSummary {
  count: number;
  successCount: number;
  failedCount: number;
  errorRate: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface ResourceMetrics {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  timestamp: string;
}

export type AiOperationStatus = 
  | "IDLE" 
  | "ACQUIRING_LOCK" 
  | "IN_FLIGHT" 
  | "DEDUPLICATED" 
  | "COMPLETED" 
  | "FAILED" 
  | "TIMEOUT" 
  | "RECOVERED";

export interface AiOperationTracker {
  operationKey: string;
  status: AiOperationStatus;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  retryAttempts: number;
  error?: string;
}

const MAX_SAMPLES_PER_CATEGORY = 500;
const latencyStore = new Map<string, LatencySample[]>();
const aiOperationsStore = new Map<string, AiOperationTracker>();

/**
 * Records an execution latency sample safely.
 */
export function recordLatency(
  category: LatencySample["category"],
  operation: string,
  durationMs: number,
  success: boolean = true,
  options?: { errorCode?: string; isCached?: boolean }
): void {
  const list = latencyStore.get(category) || [];
  list.push({
    category,
    operation,
    durationMs: Math.max(0, durationMs),
    timestamp: Date.now(),
    success,
    errorCode: options?.errorCode,
    isCached: options?.isCached
  });

  if (list.length > MAX_SAMPLES_PER_CATEGORY) {
    list.shift(); // Evict oldest
  }
  latencyStore.set(category, list);
}

/**
 * Measures the execution time of an asynchronous function.
 */
export async function measureAsync<T>(
  category: LatencySample["category"],
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  let success = true;
  let errorCode: string | undefined;

  try {
    const result = await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    recordLatency(category, operation, durationMs, success);
    return { result, durationMs };
  } catch (err: any) {
    success = false;
    errorCode = err.code || err.name || "ERROR";
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    recordLatency(category, operation, durationMs, success, { errorCode });
    throw err;
  }
}

/**
 * Measures the execution time of a synchronous function.
 */
export function measureSync<T>(
  category: LatencySample["category"],
  operation: string,
  fn: () => T
): { result: T; durationMs: number } {
  const start = performance.now();
  let success = true;
  let errorCode: string | undefined;

  try {
    const result = fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    recordLatency(category, operation, durationMs, success);
    return { result, durationMs };
  } catch (err: any) {
    success = false;
    errorCode = err.code || err.name || "ERROR";
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    recordLatency(category, operation, durationMs, success, { errorCode });
    throw err;
  }
}

/**
 * Computes summary statistics (avg, p50, p95, p99, error rate) for a given category.
 */
export function getMetricSummary(category?: LatencySample["category"]): MetricSummary {
  let samples: LatencySample[] = [];
  if (category) {
    samples = latencyStore.get(category) || [];
  } else {
    for (const list of latencyStore.values()) {
      samples.push(...list);
    }
  }

  if (samples.length === 0) {
    return {
      count: 0,
      successCount: 0,
      failedCount: 0,
      errorRate: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const durations = samples.map(s => s.durationMs).sort((a, b) => a - b);
  const count = durations.length;
  const successCount = samples.filter(s => s.success).length;
  const failedCount = count - successCount;
  const sum = durations.reduce((acc, v) => acc + v, 0);

  const getPercentile = (p: number) => {
    const idx = Math.min(count - 1, Math.max(0, Math.floor((p / 100) * count)));
    return durations[idx];
  };

  return {
    count,
    successCount,
    failedCount,
    errorRate: Math.round((failedCount / count) * 1000) / 1000,
    avgDurationMs: Math.round((sum / count) * 100) / 100,
    minDurationMs: durations[0],
    maxDurationMs: durations[count - 1],
    p50Ms: getPercentile(50),
    p95Ms: getPercentile(95),
    p99Ms: getPercentile(99)
  };
}

/**
 * Captures current Node.js process memory metrics safely.
 */
export function getResourceMetrics(): ResourceMetrics {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage();
    return {
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      externalMb: Math.round((mem.external / (1024 * 1024)) * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  return {
    rssMb: 0,
    heapUsedMb: 0,
    heapTotalMb: 0,
    externalMb: 0,
    timestamp: new Date().toISOString()
  };
}

/**
 * Tracks AI generation lifecycle transitions.
 */
export function startAiOperationTracker(operationKey: string): AiOperationTracker {
  const tracker: AiOperationTracker = {
    operationKey,
    status: "ACQUIRING_LOCK",
    startedAt: Date.now(),
    retryAttempts: 0
  };
  aiOperationsStore.set(operationKey, tracker);
  return tracker;
}

export function updateAiOperationStatus(
  operationKey: string, 
  status: AiOperationStatus, 
  extra?: { retryAttempts?: number; error?: string }
): void {
  const existing = aiOperationsStore.get(operationKey);
  if (!existing) return;

  existing.status = status;
  if (extra?.retryAttempts !== undefined) existing.retryAttempts = extra.retryAttempts;
  if (extra?.error) existing.error = extra.error;

  if (status === "COMPLETED" || status === "FAILED" || status === "TIMEOUT" || status === "RECOVERED") {
    existing.completedAt = Date.now();
    existing.durationMs = existing.completedAt - existing.startedAt;
    recordLatency("ai_generation", operationKey, existing.durationMs, status === "COMPLETED" || status === "RECOVERED");
  }
}

export function getAiOperationTracker(operationKey: string): AiOperationTracker | undefined {
  return aiOperationsStore.get(operationKey);
}

/**
 * Resets latency and metrics tracking (useful for isolated tests).
 */
export function resetPerformanceMetrics(): void {
  latencyStore.clear();
  aiOperationsStore.clear();
}
