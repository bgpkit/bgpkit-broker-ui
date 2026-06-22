import type {
    AsnInfo,
    BrokerDataEntry,
    PeersDataEntry,
    ProjectFilter,
    DataTypeFilter,
    StatusFilter,
    IpVersionFilter,
    FullFeedFilter,
} from "./types";
import { getCollectorStatus, isFullFeed, isRipeRis, isRouteViews } from "./collectors";

// Filter functions for broker data
export function filterBrokerData(
     entries: BrokerDataEntry[],
     search: string,
     project: ProjectFilter,
     dataType: DataTypeFilter,
     status: StatusFilter,
     showDecommissioned: boolean = false,
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

          // Hide decommissioned unless showDecommissioned is true
          if (entryStatus === "decommissioned" && !showDecommissioned) {
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

export interface PeersFilterCriteria {
      ipVersion?: IpVersionFilter;
      project?: ProjectFilter;
      fullFeed?: FullFeedFilter;
      collector?: string | null;
}

export function peersMatchesCriteria(
      entry: PeersDataEntry,
      criteria: PeersFilterCriteria,
      asnData: Map<number, AsnInfo>,
): boolean {
      if (criteria.ipVersion === "ipv4" && entry.num_v4_pfxs === 0) {
           return false;
      }
      if (criteria.ipVersion === "ipv6" && entry.num_v6_pfxs === 0) {
           return false;
      }

      if (criteria.project === "routeviews" && !isRouteViews(entry.collector)) {
           return false;
      }
      if (criteria.project === "riperis" && !isRipeRis(entry.collector)) {
           return false;
      }

      if (criteria.fullFeed === "fullfeed" && !isFullFeed(entry)) {
           return false;
      }
      if (criteria.fullFeed === "partial" && isFullFeed(entry)) {
           return false;
      }

      if (criteria.collector && entry.collector !== criteria.collector) {
           return false;
      }

      return true;
}

export function filterPeersByCriteria(
      entries: PeersDataEntry[],
      criteria: PeersFilterCriteria,
      asnData: Map<number, AsnInfo> = new Map(),
): PeersDataEntry[] {
      return entries.filter((entry) => peersMatchesCriteria(entry, criteria, asnData));
}
