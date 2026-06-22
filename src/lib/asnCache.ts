import type { AsnInfo, AsnApiResponse } from "./types";
import {
    ASN_BATCH_SIZE,
    ASN_CACHE_MAX_SIZE,
    ASN_CACHE_TTL_MS,
    ASN_CONCURRENCY_LIMIT,
    ASN_LOCALSTORAGE_KEY,
    ASN_LOCALSTORAGE_TTL_MS,
} from "./collectors";

const DEBUG_ASN_CACHE = false;
const logDebug = (...args: unknown[]) => {
    if (DEBUG_ASN_CACHE) {
        console.debug(...args);
    }
};

// ASN data fetching with caching
interface CachedAsnInfo {
      data: AsnInfo;
      timestamp: number;
}

const asnCache = new Map<number, CachedAsnInfo>();
const pendingRequests = new Map<number, Promise<AsnInfo | null>>();

// Load persisted ASN cache from localStorage (browser only)
function loadAsnCacheFromStorage(): void {
      if (typeof window === "undefined") return; // SSR guard
      if (typeof localStorage === "undefined") return;
      try {
            const raw = localStorage.getItem(ASN_LOCALSTORAGE_KEY);
            if (!raw) return;
            const parsed: { savedAt: number; entries: [number, CachedAsnInfo][] } = JSON.parse(raw);
            if (Date.now() - parsed.savedAt > ASN_LOCALSTORAGE_TTL_MS) {
                  localStorage.removeItem(ASN_LOCALSTORAGE_KEY);
                  return;
            }
            const now = Date.now();
            for (const [asn, entry] of parsed.entries) {
                  // Only restore entries that are still within in-memory TTL
                  if (now - entry.timestamp < ASN_CACHE_TTL_MS) {
                        asnCache.set(asn, entry);
                  }
            }
            logDebug(`[ASN Cache] Restored ${asnCache.size} entries from localStorage`);
      } catch {
            localStorage.removeItem(ASN_LOCALSTORAGE_KEY);
      }
}

function saveAsnCacheToStorage(): void {
      if (typeof window === "undefined") return;
      if (typeof localStorage === "undefined") return;
      try {
            const entries = Array.from(asnCache.entries());
            localStorage.setItem(ASN_LOCALSTORAGE_KEY, JSON.stringify({ savedAt: Date.now(), entries }));
      } catch {
            // Ignore storage quota errors
      }
}

// Hydrate in-memory cache from localStorage on module load
loadAsnCacheFromStorage();

function cleanupCache(): void {
      const now = Date.now();
      const entriesToRemove: number[] = [];

      for (const [asn, entry] of asnCache.entries()) {
            if (now - entry.timestamp > ASN_CACHE_TTL_MS) {
                  entriesToRemove.push(asn);
            }
      }

      for (const asn of entriesToRemove) {
            asnCache.delete(asn);
      }

      while (asnCache.size > ASN_CACHE_MAX_SIZE) {
            const firstKey = asnCache.keys().next().value;
            if (firstKey !== undefined) {
                  asnCache.delete(firstKey);
            }
      }
}

export async function fetchAsnInfo(asn: number): Promise<AsnInfo | null> {
      const cached = asnCache.get(asn);
      if (cached && Date.now() - cached.timestamp < ASN_CACHE_TTL_MS) {
            return cached.data;
      }

      const existingRequest = pendingRequests.get(asn);
      if (existingRequest) {
            return existingRequest;
      }

      const request = (async (): Promise<AsnInfo | null> => {
            try {
                  const response = await fetch(
                       `https://api.bgpkit.com/v3/utils/asn?asn=${asn}`,
                  );
                  if (!response.ok) {
                        return null;
                  }
                  const data: AsnApiResponse = await response.json();
                  if (data.data && data.data.length > 0) {
                        const asnInfo = data.data[0];
                        cleanupCache();
                        asnCache.set(asn, { data: asnInfo, timestamp: Date.now() });
                        return asnInfo;
                  }
                  return null;
            } catch (error) {
                  console.error(`Failed to fetch ASN info for ${asn}:`, error);
                  return null;
            } finally {
                  pendingRequests.delete(asn);
            }
      })();

      pendingRequests.set(asn, request);
      return request;
}

// Bulk fetch ASN info using POST endpoint with JSON body (much faster than individual requests)
export async function fetchAsnInfoPost(
      asns: number[],
): Promise<Map<number, AsnInfo>> {
      const result = new Map<number, AsnInfo>();

      if (asns.length === 0) {
           return result;
      }

      const now = Date.now();

      // Check cache first
      const uncachedAsns = asns.filter((asn) => {
           const cached = asnCache.get(asn);
           if (cached && now - cached.timestamp < ASN_CACHE_TTL_MS) {
                result.set(asn, cached.data);
                return false;
           }
           return true;
      });

      if (uncachedAsns.length === 0) {
           return result;
     }

     const startTime = performance.now();
     try {
          // Use POST endpoint with JSON body for bulk ASN lookup
          const response = await fetch("https://api.bgpkit.com/v3/utils/asn", {
               method: "POST",
               headers: {
                    "Content-Type": "application/json",
               },
               body: JSON.stringify({ asns: uncachedAsns }),
          });

           const duration = performance.now() - startTime;
           if (response.ok) {
                const data: AsnApiResponse = await response.json();
                if (data.data && data.data.length > 0) {
                     data.data.forEach((info) => {
                          asnCache.set(info.asn, { data: info, timestamp: Date.now() });
                          result.set(info.asn, info);
                     });
                     cleanupCache();
                }
                logDebug(
                     `[ASN Bulk] Fetched ${data.data?.length || 0}/${uncachedAsns.length} ASNs in ${duration.toFixed(1)}ms`,
                );
           } else {
                console.error(
                     `[ASN Bulk] Failed to fetch ${uncachedAsns.length} ASNs: HTTP ${response.status} (${duration.toFixed(1)}ms)`,
                );
           }
      } catch (error) {
           const duration = performance.now() - startTime;
           console.error(
                `[ASN Bulk] Error fetching ${uncachedAsns.length} ASNs after ${duration.toFixed(1)}ms:`,
                error,
           );
      }

      return result;
 }

// Batch fetch ASN info using bulk API (for large sets of ASNs)
// Fetches batches in parallel with concurrency limit for optimal performance
// Generate MD5 hash of sorted ASN list for cache key
async function generateAsnHash(asns: number[]): Promise<string> {
	const sorted = [...asns].sort((a, b) => a - b);
	const data = sorted.join(',');
	const encoder = new TextEncoder();
	const buffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest('MD5', buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function fetchAsnInfoBatch(
	asns: number[],
	onProgress?: (loaded: number, total: number) => void,
	env?: { ASN_CACHE?: KVNamespace },
): Promise<Map<number, AsnInfo>> {
	const startTime = performance.now();
	const result = new Map<number, AsnInfo>();
	const now = Date.now();

	// Check KV cache first if available (Workers environment)
	logDebug('[ASN Batch] env check:', { hasEnv: !!env, hasAsnCache: !!(env?.ASN_CACHE), asnCount: asns.length });
	if (env?.ASN_CACHE && asns.length > 0) {
		const hash = await generateAsnHash(asns);
		logDebug(`[ASN Batch] Checking KV for hash: ${hash}`);
		try {
			const kvCached = await env.ASN_CACHE.get(hash);
			logDebug(`[ASN Batch] KV get result:`, { found: !!kvCached });
			if (kvCached) {
				const { results } = JSON.parse(kvCached) as { results: Record<string, AsnInfo> };
				const parsed = new Map<number, AsnInfo>(
					Object.entries(results).map(([k, v]) => [Number(k), v]),
				);
				for (const [asn, info] of parsed) {
					asnCache.set(asn, { data: info, timestamp: now });
					result.set(asn, info);
				}
				const missingCount = asns.filter((asn) => !parsed.has(asn)).length;
				if (missingCount === 0) {
					logDebug(`[ASN Batch] KV cache hit: ${parsed.size} ASNs`);
					return parsed;
				}
				logDebug(`[ASN Batch] KV cache partial hit: ${parsed.size} ASNs, ${missingCount} missing`);
			}
		} catch (e) {
			console.error('[ASN Batch] KV read error:', e);
		}
	}

	// Check in-memory cache
	const uncachedAsns = asns.filter((asn) => {
		const cached = asnCache.get(asn);
		if (cached && now - cached.timestamp < ASN_CACHE_TTL_MS) {
			result.set(asn, cached.data);
			return false;
		}
		return true;
	});

	const cachedCount = asns.length - uncachedAsns.length;
	if (cachedCount > 0) {
		logDebug(`[ASN Batch] Using ${cachedCount} memory-cached ASNs`);
	}

	if (uncachedAsns.length === 0) {
		// Store in KV if available (even if all from memory cache)
		if (env?.ASN_CACHE && asns.length > 0) {
			const hash = await generateAsnHash(asns);
			try {
				await env.ASN_CACHE.put(hash, JSON.stringify({
					timestamp: Date.now(),
					results: Object.fromEntries(result)
				}), { expirationTtl: 86400 });
				logDebug(`[ASN Batch] Stored ${result.size} ASNs to KV`);
			} catch (e) {
				console.error('[ASN Batch] KV write error:', e);
			}
		}
		return result;
	}

	let loaded = result.size;

	// Create all batch promises
	const batches: number[][] = [];
	for (let i = 0; i < uncachedAsns.length; i += ASN_BATCH_SIZE) {
		batches.push(uncachedAsns.slice(i, i + ASN_BATCH_SIZE));
	}

	logDebug(
		`[ASN Batch] Fetching ${uncachedAsns.length} ASNs in ${batches.length} parallel batches (concurrency: ${ASN_CONCURRENCY_LIMIT})...`,
	);

	// Process batches with concurrency limit
	const processBatch = async (batch: number[], batchIndex: number) => {
		const batchStart = performance.now();
		const batchResults = await fetchAsnInfoPost(batch);
		const batchDuration = performance.now() - batchStart;

		batchResults.forEach((info, asn) => {
			result.set(asn, info);
		});

		loaded += batch.length;
		onProgress?.(loaded, asns.length);

		logDebug(
			`[ASN Batch] Batch ${batchIndex + 1}/${batches.length} completed in ${batchDuration.toFixed(1)}ms (${batchResults.size}/${batch.length} ASNs)`,
		);
	};

	// Execute with concurrency control
	for (let i = 0; i < batches.length; i += ASN_CONCURRENCY_LIMIT) {
		const currentBatches = batches.slice(i, i + ASN_CONCURRENCY_LIMIT);
		await Promise.all(
			currentBatches.map((batch, idx) => processBatch(batch, i + idx)),
		);
	}

	const totalDuration = performance.now() - startTime;
	logDebug(
		`[ASN Batch] Completed: ${result.size}/${asns.length} ASNs loaded in ${totalDuration.toFixed(1)}ms (${uncachedAsns.length} from API, ${cachedCount} cached)`,
	);

	// Persist updated cache to localStorage for reuse across page reloads
	if (uncachedAsns.length > 0) {
		saveAsnCacheToStorage();
	}

	// Store in KV if available
	logDebug('[ASN Batch] KV write check:', { hasEnv: !!env, hasAsnCache: !!(env?.ASN_CACHE), resultSize: result.size });
	if (env?.ASN_CACHE && asns.length > 0) {
		const hash = await generateAsnHash(asns);
		logDebug(`[ASN Batch] Writing to KV with hash: ${hash}, size: ${result.size}`);
		try {
			const value = JSON.stringify({
				timestamp: Date.now(),
				results: Object.fromEntries(result)
			});
			logDebug(`[ASN Batch] KV put value length: ${value.length} bytes`);
			await env.ASN_CACHE.put(hash, value, { expirationTtl: 86400 });
			logDebug(`[ASN Batch] Stored ${result.size} ASNs to KV (24h TTL)`);
		} catch (e) {
			console.error('[ASN Batch] KV write error:', e);
		}
	}

	return result;
}
