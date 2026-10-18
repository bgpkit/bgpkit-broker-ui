import type { PageServerLoad } from "./$types";
import type { BrokerData, PeersData, AsnInfo, CollectorInfo, BrokerHealthData, StreamsData } from "$lib/types";

// Temporary v4 test: collector status and health are read from the v4 dev API.
// peers, collectors, streams and ASN lookups are not served by v4 yet and stay on v3.
const V3_API = "https://api.bgpkit.com/v3/broker";
const V4_API = "https://dev.api.bgpkit.com/v4/broker";

async function readJsonResponse<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label} request failed: ${response.status} ${response.statusText}`);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error(`${label} returned invalid JSON`, { cause: error });
  }
}

async function readOptionalJsonResponse<T>(response: Response, label: string): Promise<T | null> {
  try {
    return await readJsonResponse<T>(response, label);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export const load: PageServerLoad = async ({ fetch, url }): Promise<{
  brokerData: BrokerData;
  peersData: PeersData | null;
  asnData: Map<number, AsnInfo>;
  collectorsData: CollectorInfo[];
  healthData: BrokerHealthData | null;
  streamsData: StreamsData | null;
  initialTab: number;
}> => {
  const [brokerResponse, collectorsResponse, healthResponse, streamsResponse] = await Promise.all([
    fetch(`${V4_API}/latest`),
    fetch(`${V3_API}/collectors`),
    fetch(`${V4_API}/health`),
    fetch(`${V3_API}/streams`),
  ]);

  const [brokerData, collectorsResponseJson, healthData, streamsData] = await Promise.all([
    readJsonResponse<BrokerData>(brokerResponse, "Broker latest API"),
    readJsonResponse<{ data?: CollectorInfo[] }>(collectorsResponse, "Collectors API"),
    readOptionalJsonResponse<BrokerHealthData>(healthResponse, "Broker health API"),
    readOptionalJsonResponse<StreamsData>(streamsResponse, "RouteViews streams API"),
  ]);
  const collectorsData = collectorsResponseJson.data ?? [];

  const tabParam = url.searchParams.get("tab");
  let initialTab = 0;
  if (tabParam === "live") initialTab = 5;
  else if (tabParam === "streams") initialTab = 4;
  else if (tabParam === "search") initialTab = 3;
  else if (tabParam === "selector") initialTab = 2;
  else if (
    tabParam === "peers" ||
    url.searchParams.has("asnModal") ||
    (url.searchParams.has("countryModal") && tabParam !== "collectors")
  ) {
    initialTab = 1;
  }

  // Peers and ASN enrichment are loaded client-side: the peer table is the bulk of
  // the SSR payload (3.4k rows, 837 unique ASNs + one ASN lookup per render) and is
  // only needed once a tab that shows it is opened.
  return {
    brokerData,
    peersData: null,
    asnData: new Map<number, AsnInfo>(),
    collectorsData,
    healthData,
    streamsData,
    initialTab,
  };
};
