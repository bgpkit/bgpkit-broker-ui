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
