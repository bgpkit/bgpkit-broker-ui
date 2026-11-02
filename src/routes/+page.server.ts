import type { PageServerLoad } from "./$types";
import type { BrokerData, PeersData, AsnInfo, CollectorInfo, BrokerHealthData, StreamsData } from "$lib/types";

// Everything on this page reads the v3 broker surface, which is what the status page has always
// consumed and whose row shapes the components are written against. The temporary v4 test that
// pointed `latest` and `health` at dev.api.bgpkit.com/v4/broker was retired with the v4
// restructure: those paths no longer exist, and their replacements
// (/v4/mrt/collectors/latest, /v4/meta/health) answer different shapes, so adopting them is its
// own change rather than a URL swap.
const V3_API = "https://api.bgpkit.com/v3/broker";

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
    fetch(`${V3_API}/latest`),
    fetch(`${V3_API}/collectors`),
    fetch(`${V3_API}/health`),
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
