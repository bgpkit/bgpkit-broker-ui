export interface BrokerDataEntry {
  collector_id: string;
  data_type: string;
  rough_size: number;
  exact_size: number;
  delay: number;
  collector_url: string;
  ts_start: string;
  ts_end: string;
  url: string;
}

export interface BrokerData {
  count: number;
  data: BrokerDataEntry[];
  meta: {
    backend: string;
    latest_update_ts: string;
    latest_update_duration: number;
  };
}

export interface PeersData {
  count: number;
  last_updated_at: string;
  data: PeersDataEntry[];
}

export interface PeersDataEntry {
  date: string;
  collector: string;
  ip: string;
  asn: number;
  num_v4_pfxs: number;
  num_v6_pfxs: number;
  num_connected_asns: number;
}

export interface CombinedData {
  brokerData: BrokerData;
  peersData: PeersData;
  asnData: Map<number, AsnInfo>;
}

// ASN Information types
export interface As2Org {
  country: string;
  name: string;
  org_id: string;
  org_name: string;
}

export interface Hegemony {
  asn: number;
  ipv4: number;
  ipv6: number;
}

export interface PeeringDb {
  aka: string;
  asn: number;
  irr_as_set: string;
  name: string;
  name_long: string;
  website: string;
}

export interface Population {
  percent_country: number;
  percent_global: number;
  sample_count: number;
  user_count: number;
}

export interface AsnInfo {
  asn: number;
  name: string;
  country: string;
  country_name: string;
  as2org?: As2Org;
  hegemony?: Hegemony;
  peeringdb?: PeeringDb;
  population?: Population;
}

export interface AsnApiResponse {
  data: AsnInfo[];
  count: number;
  updatedAt: string;
  page: number;
  page_size: number;
}

// Filter types
export type ProjectFilter = "all" | "routeviews" | "riperis";
export type DataTypeFilter = "all" | "rib" | "updates";
export type StatusFilter = "all" | "ontime" | "delayed";
export type IpVersionFilter = "all" | "ipv4" | "ipv6";
export type FullFeedFilter = "all" | "fullfeed" | "partial";

// Collector summary for modal
export interface CollectorSummary {
  collector_id: string;
  project: "RouteViews" | "RIPE RIS";
  status: "ok" | "delayed" | "deprecated";
  latestRib?: BrokerDataEntry;
  latestUpdates?: BrokerDataEntry;
  peerCount: number;
  fullFeedPeerCount: number;
  uniqueCountries: string[];
  uniqueAsns: number[];
}

// Country summary for country modal
export interface CountrySummary {
  countryCode: string;
  countryName: string;
  totalPeers: number;
  fullFeedPeers: number;
  uniqueAsns: number;
  collectors: {
    collector: string;
    peerCount: number;
    fullFeedCount: number;
  }[];
}

// Coverage selector types
export type CoverageGoal = "asns" | "countries";
export type IpFamilyFilter = "all" | "ipv4" | "ipv6";

export interface CollectorCoverage {
  collector: string;
  peers: PeersDataEntry[];
  fullFeedPeers: PeersDataEntry[];
  uniqueAsns: Set<number>;
  uniqueCountries: Set<string>;
}

export interface CoverageResult {
  selectedCollectors: string[];
  totalCoverage: number;
  coverageByStep: {
    collector: string;
    newCoverage: number;
    cumulativeCoverage: number;
  }[];
}
