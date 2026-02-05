import type {
     AsnInfo,
     AsnApiResponse,
     BrokerDataEntry,
     PeersDataEntry,
     ProjectFilter,
     DataTypeFilter,
     StatusFilter,
     IpVersionFilter,
     FullFeedFilter,
     CollectorSummary,
     CountrySummary,
} from "./types";

export function fileDelayed(delay: number, data_type: string): boolean {
     return (
          (delay > 60 * 60 && data_type === "updates") ||
          (delay > 60 * 60 * 24 && data_type === "rib")
     );
}

export const DEPRECATED_COLLECTORS = [
     "rrc02",
     "rrc08",
     "rrc09",
     "route-views.jinx",
     "route-views.siex",
     "route-views.saopaulo",
];

// Project detection helpers
export function isRipeRis(collectorId: string): boolean {
     return collectorId.startsWith("rrc");
}

export function isRouteViews(collectorId: string): boolean {
     return !isRipeRis(collectorId);
}

export function getProject(collectorId: string): "RouteViews" | "RIPE RIS" {
     return isRipeRis(collectorId) ? "RIPE RIS" : "RouteViews";
}

// Status detection
export function getCollectorStatus(
     collectorId: string,
     delay: number,
     dataType: string,
): "ok" | "delayed" | "deprecated" {
     if (DEPRECATED_COLLECTORS.includes(collectorId)) {
          return "deprecated";
     }
     if (fileDelayed(delay, dataType)) {
          return "delayed";
     }
     return "ok";
}

// Full-feed detection
export function isFullFeed(entry: PeersDataEntry): boolean {
     return entry.num_v4_pfxs > 700_000 || entry.num_v6_pfxs > 100_000;
}

// Filter functions for broker data
export function filterBrokerData(
     entries: BrokerDataEntry[],
     search: string,
     project: ProjectFilter,
     dataType: DataTypeFilter,
     status: StatusFilter,
     showDeprecated: boolean = false,
): BrokerDataEntry[] {
     return entries.filter((entry) => {
          // Search filter
          if (
               search &&
               !entry.collector_id.toLowerCase().includes(search.toLowerCase())
          ) {
               return false;
          }

          // Project filter
          if (project === "routeviews" && !isRouteViews(entry.collector_id)) {
               return false;
          }
          if (project === "riperis" && !isRipeRis(entry.collector_id)) {
               return false;
          }

          // Data type filter
          if (dataType !== "all" && entry.data_type !== dataType) {
               return false;
          }

          // Status filter
          const entryStatus = getCollectorStatus(
               entry.collector_id,
               entry.delay,
               entry.data_type,
          );

          // Hide deprecated unless showDeprecated is true
          if (entryStatus === "deprecated" && !showDeprecated) {
               return false;
          }

          if (status === "ontime" && entryStatus !== "ok") {
               return false;
          }
          if (status === "delayed" && entryStatus !== "delayed") {
               return false;
          }

          return true;
     });
}

// Filter functions for peers data
export function filterPeersData(
     entries: PeersDataEntry[],
     search: string,
     project: ProjectFilter,
     ipVersion: IpVersionFilter,
     fullFeed: FullFeedFilter,
     collectorFilter: string,
     countryFilter: string = "",
     asnData: Map<number, AsnInfo> = new Map(),
): PeersDataEntry[] {
     return entries.filter((entry) => {
          // Search filter (searches collector, ASN, IP, ASN name/org)
          if (search) {
               const searchLower = search.toLowerCase();
               const searchNum = parseInt(search, 10);
               const isAsnSearch = !isNaN(searchNum) && search.trim() === searchNum.toString();

               // If searching for an ASN number, require exact match
               if (isAsnSearch) {
                    if (entry.asn !== searchNum) {
                         return false;
                    }
               } else {
                    // Text search across multiple fields
                    const matchesCollector = entry.collector
                         .toLowerCase()
                         .includes(searchLower);
                    const matchesIp = entry.ip.toLowerCase().includes(searchLower);

                    // Search ASN name and organization
                    const asnInfo = asnData.get(entry.asn);
                    const asnName = asnInfo?.name?.toLowerCase() || '';
                    const orgName = asnInfo?.as2org?.org_name?.toLowerCase() || '';
                    const as2orgName = asnInfo?.as2org?.name?.toLowerCase() || '';

                    const matchesAsnName = asnName.includes(searchLower);
                    const matchesOrgName = orgName.includes(searchLower);
                    const matchesAs2orgName = as2orgName.includes(searchLower);

                    if (!matchesCollector && !matchesIp && !matchesAsnName && !matchesOrgName && !matchesAs2orgName) {
                         return false;
                    }
               }
          }

          // Collector filter (exact match for dropdown)
          if (collectorFilter && entry.collector !== collectorFilter) {
               return false;
          }

          // Project filter
          if (project === "routeviews" && !isRouteViews(entry.collector)) {
               return false;
          }
          if (project === "riperis" && !isRipeRis(entry.collector)) {
               return false;
          }

          // IP version filter
          if (ipVersion === "ipv4" && entry.num_v4_pfxs === 0) {
               return false;
          }
          if (ipVersion === "ipv6" && entry.num_v6_pfxs === 0) {
               return false;
          }

          // Full-feed filter
          const entryIsFullFeed = isFullFeed(entry);
          if (fullFeed === "fullfeed" && !entryIsFullFeed) {
               return false;
          }
          if (fullFeed === "partial" && entryIsFullFeed) {
               return false;
          }

          // Country filter
          if (countryFilter) {
               const asnInfo = asnData.get(entry.asn);
               if (!asnInfo?.country || asnInfo.country !== countryFilter) {
                    return false;
               }
          }

          return true;
     });
}

// ASN data fetching with caching
const asnCache = new Map<number, AsnInfo>();

export async function fetchAsnInfo(asn: number): Promise<AsnInfo | null> {
     if (asnCache.has(asn)) {
          return asnCache.get(asn)!;
     }

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
               asnCache.set(asn, asnInfo);
               return asnInfo;
          }
          return null;
     } catch (error) {
          console.error(`Failed to fetch ASN info for ${asn}:`, error);
          return null;
     }
}

// Bulk fetch ASN info using POST endpoint with JSON body (much faster than individual requests)
export async function fetchAsnInfoBulk(
     asns: number[],
): Promise<Map<number, AsnInfo>> {
     const result = new Map<number, AsnInfo>();

     if (asns.length === 0) {
          return result;
     }

     // Check cache first
     const uncachedAsns = asns.filter((asn) => {
          if (asnCache.has(asn)) {
               result.set(asn, asnCache.get(asn)!);
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
                         asnCache.set(info.asn, info);
                         result.set(info.asn, info);
                    });
               }
               console.log(
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
export async function fetchAsnInfoBatch(
     asns: number[],
     onProgress?: (loaded: number, total: number) => void,
): Promise<Map<number, AsnInfo>> {
     const startTime = performance.now();
     const result = new Map<number, AsnInfo>();
     const uncachedAsns = asns.filter((asn) => {
          if (asnCache.has(asn)) {
               result.set(asn, asnCache.get(asn)!);
               return false;
          }
          return true;
     });

     const cachedCount = asns.length - uncachedAsns.length;
     if (cachedCount > 0) {
          console.log(`[ASN Batch] Using ${cachedCount} cached ASNs`);
     }

     if (uncachedAsns.length === 0) {
          return result;
     }

     // Fetch in batches with parallel concurrency
     const batchSize = 1000;
     const concurrencyLimit = 3; // Fetch up to 3 batches simultaneously
     let loaded = result.size;

     // Create all batch promises
     const batches: number[][] = [];
     for (let i = 0; i < uncachedAsns.length; i += batchSize) {
          batches.push(uncachedAsns.slice(i, i + batchSize));
     }

     console.log(
          `[ASN Batch] Fetching ${uncachedAsns.length} ASNs in ${batches.length} parallel batches (concurrency: ${concurrencyLimit})...`,
     );

     // Process batches with concurrency limit
     const processBatch = async (batch: number[], batchIndex: number) => {
          const batchStart = performance.now();
          const batchResults = await fetchAsnInfoBulk(batch);
          const batchDuration = performance.now() - batchStart;

          batchResults.forEach((info, asn) => {
               result.set(asn, info);
          });

          loaded += batch.length;
          onProgress?.(loaded, asns.length);

          console.log(
               `[ASN Batch] Batch ${batchIndex + 1}/${batches.length} completed in ${batchDuration.toFixed(1)}ms (${batchResults.size}/${batch.length} ASNs)`,
          );
     };

     // Execute with concurrency control
     for (let i = 0; i < batches.length; i += concurrencyLimit) {
          const currentBatches = batches.slice(i, i + concurrencyLimit);
          await Promise.all(
               currentBatches.map((batch, idx) => processBatch(batch, i + idx)),
          );
     }

     const totalDuration = performance.now() - startTime;
     console.log(
          `[ASN Batch] Completed: ${result.size}/${asns.length} ASNs loaded in ${totalDuration.toFixed(1)}ms (${uncachedAsns.length} from API, ${cachedCount} cached)`,
     );

     return result;
}

// Get unique collectors from peers data (sorted by project then name)
export function getUniqueCollectors(entries: PeersDataEntry[]): string[] {
     const collectors = new Set<string>();
     entries.forEach((entry) => collectors.add(entry.collector));
     return Array.from(collectors).sort(sortCollectors);
}

// Sort collectors by project (RIPE RIS first) then by name
export function sortCollectors(a: string, b: string): number {
     const aIsRis = isRipeRis(a);
     const bIsRis = isRipeRis(b);

     // RIPE RIS collectors first
     if (aIsRis && !bIsRis) return -1;
     if (!aIsRis && bIsRis) return 1;

     // Within same project, sort by name
     return a.localeCompare(b);
}

// Get unique ASNs from peers data
export function getUniqueAsns(entries: PeersDataEntry[]): number[] {
     const asns = new Set<number>();
     entries.forEach((entry) => asns.add(entry.asn));
     return Array.from(asns).sort((a, b) => a - b);
}

// Get unique countries from peers data using ASN info
export function getUniqueCountries(
     entries: PeersDataEntry[],
     asnData: Map<number, AsnInfo>,
): string[] {
     const countries = new Set<string>();
     entries.forEach((entry) => {
          const info = asnData.get(entry.asn);
          if (info?.country) {
               countries.add(info.country);
          }
     });
     return Array.from(countries).sort();
}

// Build country summary for country modal
export function buildCountrySummary(
     countryCode: string,
     peerEntries: PeersDataEntry[],
     asnData: Map<number, AsnInfo>,
): CountrySummary {
     // Get all peers from this country
     const countryPeers = peerEntries.filter((entry) => {
          const info = asnData.get(entry.asn);
          return info?.country === countryCode;
     });

     // Group by collector
     const collectorStats = new Map<
          string,
          { total: number; fullFeed: number }
     >();
     countryPeers.forEach((peer) => {
          const stats = collectorStats.get(peer.collector) || {
               total: 0,
               fullFeed: 0,
          };
          stats.total += 1;
          if (isFullFeed(peer)) {
               stats.fullFeed += 1;
          }
          collectorStats.set(peer.collector, stats);
     });

     // Get country name from first ASN
     let countryName = countryCode;
     for (const peer of countryPeers) {
          const info = asnData.get(peer.asn);
          if (info?.country_name) {
               countryName = info.country_name;
               break;
          }
     }

     // Get unique ASNs
     const uniqueAsns = [...new Set(countryPeers.map((p) => p.asn))];

     return {
          countryCode,
          countryName,
          totalPeers: countryPeers.length,
          fullFeedPeers: countryPeers.filter(isFullFeed).length,
          uniqueAsns: uniqueAsns.length,
          collectors: Array.from(collectorStats.entries())
               .map(([collector, stats]) => ({
                    collector,
                    peerCount: stats.total,
                    fullFeedCount: stats.fullFeed,
               }))
               .sort((a, b) => b.peerCount - a.peerCount),
     };
}

// Build collector summary
export function buildCollectorSummary(
     collectorId: string,
     brokerEntries: BrokerDataEntry[],
     peerEntries: PeersDataEntry[],
     asnData: Map<number, AsnInfo>,
): CollectorSummary {
     const collectorBrokerData = brokerEntries.filter(
          (e) => e.collector_id === collectorId,
     );
     const collectorPeers = peerEntries.filter(
          (e) => e.collector === collectorId,
     );

     const latestRib = collectorBrokerData.find((e) => e.data_type === "rib");
     const latestUpdates = collectorBrokerData.find(
          (e) => e.data_type === "updates",
     );

     // Determine status from either rib or updates
     let status: "ok" | "delayed" | "deprecated" = "ok";
     if (DEPRECATED_COLLECTORS.includes(collectorId)) {
          status = "deprecated";
     } else {
          const ribDelayed = latestRib && fileDelayed(latestRib.delay, "rib");
          const updatesDelayed =
               latestUpdates && fileDelayed(latestUpdates.delay, "updates");
          if (ribDelayed || updatesDelayed) {
               status = "delayed";
          }
     }

     // Get unique countries from ASN data
     const uniqueAsns = [...new Set(collectorPeers.map((p) => p.asn))];
     const uniqueCountries = new Set<string>();
     uniqueAsns.forEach((asn) => {
          const info = asnData.get(asn);
          if (info?.country) {
               uniqueCountries.add(info.country);
          }
     });

     return {
          collector_id: collectorId,
          project: getProject(collectorId),
          status,
          latestRib,
          latestUpdates,
          peerCount: collectorPeers.length,
          fullFeedPeerCount: collectorPeers.filter(isFullFeed).length,
          uniqueCountries: Array.from(uniqueCountries).sort(),
          uniqueAsns,
     };
}

// Country code to flag emoji
export function countryToFlag(countryCode: string): string {
     if (!countryCode || countryCode.length !== 2) return "";
     const codePoints = countryCode
          .toUpperCase()
          .split("")
          .map((char) => 127397 + char.charCodeAt(0));
     return String.fromCodePoint(...codePoints);
}

// Extract collector URL from file URL
export function extractCollectorUrl(inputString: string): string {
     if (!inputString) return "";

     // Regular expression to match the pattern 'xxxx.xx' where x is a digit
     const pattern = /\d{4}\.\d{2}/;

     // Find the index of the pattern in the input string
     const matchIndex = inputString.search(pattern);

     // If the pattern is found, delete everything after it, else return the original string
     return matchIndex >= 0 ? inputString.slice(0, matchIndex) : inputString;
}

// Sort helpers
export type SortDirection = "asc" | "desc";

export type BrokerSortColumn =
     | "collector_id"
     | "data_type"
     | "status"
     | "ts_start"
     | "delay"
     | "rough_size";

export function sortBrokerData(
     entries: BrokerDataEntry[],
     sortBy: BrokerSortColumn,
     direction: SortDirection,
): BrokerDataEntry[] {
     return [...entries].sort((a, b) => {
          let comparison = 0;

          if (sortBy === "status") {
               // Sort by status: ok < delayed < deprecated
               const statusOrder = { ok: 0, delayed: 1, deprecated: 2 };
               const aStatus = getCollectorStatus(
                    a.collector_id,
                    a.delay,
                    a.data_type,
               );
               const bStatus = getCollectorStatus(
                    b.collector_id,
                    b.delay,
                    b.data_type,
               );
               comparison = statusOrder[aStatus] - statusOrder[bStatus];
          } else if (sortBy === "collector_id") {
               comparison = sortCollectors(a.collector_id, b.collector_id);
          } else if (sortBy === "data_type") {
               comparison = a.data_type.localeCompare(b.data_type);
          } else if (sortBy === "ts_start") {
               comparison = a.ts_start.localeCompare(b.ts_start);
          } else if (sortBy === "delay") {
               comparison = a.delay - b.delay;
          } else if (sortBy === "rough_size") {
               comparison = a.rough_size - b.rough_size;
          }

          return direction === "asc" ? comparison : -comparison;
     });
}

export function sortPeersData(
     entries: PeersDataEntry[],
     sortBy: keyof PeersDataEntry | "fullFeed",
     direction: SortDirection,
): PeersDataEntry[] {
     return [...entries].sort((a, b) => {
          let comparison = 0;

           if (sortBy === "fullFeed") {
                const aFullFeed = isFullFeed(a) ? 1 : 0;
                const bFullFeed = isFullFeed(b) ? 1 : 0;
                comparison = aFullFeed - bFullFeed;
           } else {
                const aVal = a[sortBy];
                const bVal = b[sortBy];

                if (typeof aVal === "string" && typeof bVal === "string") {
                     comparison = aVal.localeCompare(bVal);
                } else if (
                     typeof aVal === "number" &&
                     typeof bVal === "number"
                ) {
                     comparison = aVal - bVal;
                }
           }

           return direction === "asc" ? comparison : -comparison;
      });
}

// Greedy maximum coverage algorithm for collector selection
// Selects minimum set of collectors to maximize coverage of ASNs or countries
export function calculateGreedyCoverage(
	peersData: PeersDataEntry[],
	asnData: Map<number, AsnInfo>,
	goal: "asns" | "countries",
	ipFamily: "all" | "ipv4" | "ipv6",
	project: "any" | "rv" | "ris" | "balanced" = "any",
	maxCollectors: number = 10,
): {
	selectedCollectors: string[];
	totalCoverage: number;
	coverageByStep: {
		collector: string;
		newCoverage: number;
		cumulativeCoverage: number;
	}[];
	collectorDetails: Map<
		string,
		{
			peers: PeersDataEntry[];
			fullFeedPeers: PeersDataEntry[];
			uniqueAsns: Set<number>;
			uniqueCountries: Set<string>;
		}
	>;
	availableCollectorsCount: number;
} {
	// Filter peers by IP family and project (same logic as chart and stats)
	const filteredPeers = peersData.filter((peer) => {
		// IP family filter
		if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
		if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
		// Project filter (for non-balanced modes)
		if (project === "rv" && isRipeRis(peer.collector)) return false;
		if (project === "ris" && !isRipeRis(peer.collector)) return false;
		return true;
	});

	// Group peers by collector
	const collectorPeers = new Map<string, PeersDataEntry[]>();
	for (const peer of filteredPeers) {
		const existing = collectorPeers.get(peer.collector) || [];
		existing.push(peer);
		collectorPeers.set(peer.collector, existing);
	}

	const availableCollectorsCount = collectorPeers.size;

	// Calculate coverage for each collector (only full-feed peers)
	const collectorDetails = new Map<
		string,
		{
			peers: PeersDataEntry[];
			fullFeedPeers: PeersDataEntry[];
			uniqueAsns: Set<number>;
			uniqueCountries: Set<string>;
		}
	>();

	for (const [collector, peers] of collectorPeers) {
		const fullFeedPeers = peers.filter(isFullFeed);
		const uniqueAsns = new Set(fullFeedPeers.map((p) => p.asn));
		const uniqueCountries = new Set<string>();

		for (const peer of fullFeedPeers) {
			const info = asnData.get(peer.asn);
			if (info?.country) {
				uniqueCountries.add(info.country);
			}
		}

		collectorDetails.set(collector, {
			peers,
			fullFeedPeers,
			uniqueAsns,
			uniqueCountries,
		});
	}

	// Greedy selection
	const selectedCollectors: string[] = [];
	const coveredItems = new Set<string | number>();
	const coverageByStep: {
		collector: string;
		newCoverage: number;
		cumulativeCoverage: number;
	}[] = [];

	// Track counts for balanced mode
	let rvCount = 0;
	let risCount = 0;

	while (selectedCollectors.length < maxCollectors) {
		let bestCollector: string | null = null;
		let bestNewCoverage = 0;
		let bestItems: Set<string | number> = new Set();
		let bestIsRis = false;

		for (const [collector, details] of collectorDetails) {
			if (selectedCollectors.includes(collector)) continue;

			const isRisCollector = isRipeRis(collector);

			// For balanced mode, enforce 50/50 split
			if (project === "balanced") {
				const targetRv = Math.ceil(maxCollectors / 2);
				const targetRis = Math.floor(maxCollectors / 2);

				if (isRisCollector && risCount >= targetRis) continue;
				if (!isRisCollector && rvCount >= targetRv) continue;
			}

			const items =
				goal === "asns" ? details.uniqueAsns : details.uniqueCountries;
			const newItems = new Set<string | number>();

			for (const item of items) {
				if (!coveredItems.has(item)) {
					newItems.add(item);
				}
			}

			if (newItems.size > bestNewCoverage) {
				bestNewCoverage = newItems.size;
				bestCollector = collector;
				bestItems = newItems;
				bestIsRis = isRisCollector;
			}
		}

		if (bestCollector === null || bestNewCoverage === 0) {
			break;
		}

		selectedCollectors.push(bestCollector);
		for (const item of bestItems) {
			coveredItems.add(item);
		}

		if (bestIsRis) {
			risCount++;
		} else {
			rvCount++;
		}

		coverageByStep.push({
			collector: bestCollector,
			newCoverage: bestNewCoverage,
			cumulativeCoverage: coveredItems.size,
		});
	}

	return {
		selectedCollectors,
		totalCoverage: coveredItems.size,
		coverageByStep,
		collectorDetails,
		availableCollectorsCount,
	};
}

// Calculate coverage curve data for chart visualization
// Runs the greedy algorithm twice: once optimizing for ASNs, once for countries
export function calculateCoverageCurve(
	peersData: PeersDataEntry[],
	asnInfoMap: Map<number, AsnInfo>,
	ipFamily: "all" | "ipv4" | "ipv6",
	project: "any" | "rv" | "ris" | "balanced" = "any",
	maxCollectors: number = 81,
): {
	labels: number[];
	asnCoverage: { counts: number[]; percents: number[] };
	countryCoverage: { counts: number[]; percents: number[] };
} {
	// Calculate baseline totals from ALL collectors (ignoring project filter)
	// Use ASNs with at least one full-feed peer for percentage calculation
	const baselinePeers = peersData.filter((peer) => {
		if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
		if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
		return true;
	});

	const baselineFullFeedPeers = baselinePeers.filter(isFullFeed);
	const baselineAsns = new Set(baselineFullFeedPeers.map((p) => p.asn));
	const baselineCountries = new Set<string>();

	for (const peer of baselineFullFeedPeers) {
		const info = asnInfoMap.get(peer.asn);
		if (info?.country) {
			baselineCountries.add(info.country);
		}
	}

	const totalBaselineAsns = baselineAsns.size;
	const totalBaselineCountries = baselineCountries.size;

	// Filter peers by IP family and project (same logic as greedy algorithm)
	const filteredPeers = peersData.filter((peer) => {
		if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
		if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
		if (project === "rv" && isRipeRis(peer.collector)) return false;
		if (project === "ris" && !isRipeRis(peer.collector)) return false;
		return true;
	});

	// Get available collectors (same logic as greedy algorithm)
	const availableCollectors = new Set(filteredPeers.map((p) => p.collector));
	const totalAvailableCollectors = availableCollectors.size;

	const labels: number[] = [];
	const asnCounts: number[] = [];
	const asnPercents: number[] = [];
	const countryCounts: number[] = [];
	const countryPercents: number[] = [];

	for (let i = 1; i <= maxCollectors; i++) {
		const effectiveMax = Math.min(i, totalAvailableCollectors);

		// Run greedy algorithm optimized for ASNs
		const asnResult = calculateGreedyCoverage(
			peersData,
			asnInfoMap,
			"asns",
			ipFamily,
			project,
			effectiveMax,
		);

		// Run greedy algorithm optimized for countries
		const countryResult = calculateGreedyCoverage(
			peersData,
			asnInfoMap,
			"countries",
			ipFamily,
			project,
			effectiveMax,
		);

		// Count unique ASNs from ASN-optimized selection
		const selectedAsns = new Set<number>();
		for (const collector of asnResult.selectedCollectors) {
			const details = asnResult.collectorDetails.get(collector);
			if (details) {
				for (const asn of details.uniqueAsns) {
					selectedAsns.add(asn);
				}
			}
		}

		// Count unique countries from country-optimized selection
		const selectedCountries = new Set<string>();
		for (const collector of countryResult.selectedCollectors) {
			const details = countryResult.collectorDetails.get(collector);
			if (details) {
				for (const country of details.uniqueCountries) {
					selectedCountries.add(country);
				}
			}
		}

		labels.push(i);
		asnCounts.push(selectedAsns.size);
		asnPercents.push(totalBaselineAsns > 0 ? Math.round((selectedAsns.size / totalBaselineAsns) * 100) : 0);
		countryCounts.push(selectedCountries.size);
		countryPercents.push(totalBaselineCountries > 0 ? Math.round((selectedCountries.size / totalBaselineCountries) * 100) : 0);
	}

	return {
		labels,
		asnCoverage: { counts: asnCounts, percents: asnPercents },
		countryCoverage: { counts: countryCounts, percents: countryPercents },
	};
}

// Debug function to analyze coverage issues
export function debugCoverageAnalysis(
	peersData: PeersDataEntry[],
	asnData: Map<number, AsnInfo>,
	maxCollectors: number = 10
) {
	console.log("=== Debug Coverage Analysis ===\n");

	const isFullFeedPeer = (peer: PeersDataEntry) =>
		(peer.num_v4_pfxs > 700_000) || (peer.num_v6_pfxs > 100_000);

	const collectors = new Set<string>();
	const risCollectors = new Set<string>();
	const rvCollectors = new Set<string>();
	const fullFeedPeers = peersData.filter(isFullFeedPeer);

	for (const peer of fullFeedPeers) {
		collectors.add(peer.collector);
		if (isRipeRis(peer.collector)) {
			risCollectors.add(peer.collector);
		} else {
			rvCollectors.add(peer.collector);
		}
	}

	console.log(`Total collectors with full-feed peers: ${collectors.size}`);
	console.log(`RIS collectors: ${risCollectors.size}`);
	console.log(`RouteViews collectors: ${rvCollectors.size}`);

	const allAsns = new Set<number>();
	const risAsns = new Set<number>();
	const rvAsns = new Set<number>();

	for (const peer of fullFeedPeers) {
		allAsns.add(peer.asn);
		if (isRipeRis(peer.collector)) {
			risAsns.add(peer.asn);
		} else {
			rvAsns.add(peer.asn);
		}
	}

	console.log(`\nTotal unique ASNs (full-feed): ${allAsns.size}`);
	console.log(`RIS-only ASNs: ${risAsns.size}`);
	console.log(`RV-only ASNs: ${rvAsns.size}`);

	const intersection = new Set([...risAsns].filter(x => rvAsns.has(x)));
	console.log(`Overlapping ASNs: ${intersection.size}`);

	console.log("\n=== Greedy Algorithm Test ===");

	const risResult = calculateGreedyCoverage(peersData, asnData, "asns", "all", "ris", maxCollectors);
	const anyResult = calculateGreedyCoverage(peersData, asnData, "asns", "all", "any", maxCollectors);

	const risPercent = Math.round((risResult.totalCoverage / allAsns.size) * 100);
	const anyPercent = Math.round((anyResult.totalCoverage / allAsns.size) * 100);

	console.log(`\nCoverage (of all ASNs):`);
	console.log(`  RIS-only: ${risResult.totalCoverage} ASNs (${risPercent}%)`);
	console.log(`  Any:      ${anyResult.totalCoverage} ASNs (${anyPercent}%)`);

	console.log("\n=== Selected Collectors ===");
	console.log("RIS-only:", risResult.selectedCollectors);
	console.log("Any:", anyResult.selectedCollectors);

	return { risCoverage: risResult.totalCoverage, anyCoverage: anyResult.totalCoverage };
}
