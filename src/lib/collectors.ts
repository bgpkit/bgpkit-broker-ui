import type {
    AsnInfo,
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
          (delay > UPDATES_DELAY_THRESHOLD_SECONDS && data_type === "updates") ||
          (delay > RIB_DELAY_THRESHOLD_SECONDS && data_type === "rib")
     );
 }

export const DECOMMISSIONED_COLLECTORS = [
     "rrc02",
     "rrc08",
     "rrc09",
     "route-views.chile",
     "route-views.jinx",
     "route-views.siex",
     "route-views.saopaulo",
];

export const FULL_FEED_V4_THRESHOLD = 700_000;
export const FULL_FEED_V6_THRESHOLD = 100_000;

export const ASN_CACHE_MAX_SIZE = 10000;
export const ASN_CACHE_TTL_MS = 60 * 60 * 1000;
export const ASN_LOCALSTORAGE_KEY = "bgpkit-asn-cache";
export const ASN_LOCALSTORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const ASN_BATCH_SIZE = 1000;
export const ASN_CONCURRENCY_LIMIT = 3;

export const UPDATES_DELAY_THRESHOLD_SECONDS = 60 * 60;
export const RIB_DELAY_THRESHOLD_SECONDS = 60 * 60 * 24;

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
): "ok" | "delayed" | "decommissioned" {
     if (DECOMMISSIONED_COLLECTORS.includes(collectorId)) {
          return "decommissioned";
     }
     if (fileDelayed(delay, dataType)) {
          return "delayed";
     }
     return "ok";
}

// Full-feed detection
export function isFullFeed(entry: PeersDataEntry): boolean {
     return entry.num_v4_pfxs > FULL_FEED_V4_THRESHOLD || entry.num_v6_pfxs > FULL_FEED_V6_THRESHOLD;
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
     let status: "ok" | "delayed" | "decommissioned" = "ok";
     if (DECOMMISSIONED_COLLECTORS.includes(collectorId)) {
          status = "decommissioned";
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
               // Sort by status: ok < delayed < decommissioned
               const statusOrder = { ok: 0, delayed: 1, decommissioned: 2 };
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
