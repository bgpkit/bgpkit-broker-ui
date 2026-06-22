import type { PageServerLoad } from "./$types";
import type { BrokerData, PeersData, AsnInfo, CollectorInfo } from "$lib/types";
import { fetchAsnInfoBatch } from "$lib/asnCache";

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

export const load: PageServerLoad = async ({ fetch, url, platform }): Promise<{
  brokerData: BrokerData;
  peersData: PeersData;
  asnData: Map<number, AsnInfo>;
  collectorsData: CollectorInfo[];
  initialTab: number;
}> => {
  const [brokerResponse, peersResponse, collectorsResponse] = await Promise.all([
    fetch("https://api.bgpkit.com/v3/broker/latest"),
    fetch("https://api.bgpkit.com/v3/peers/list"),
    fetch("https://api.bgpkit.com/v3/broker/collectors"),
  ]);

  const [brokerData, peersData, collectorsResponseJson] = await Promise.all([
    readJsonResponse<BrokerData>(brokerResponse, "Broker latest API"),
    readJsonResponse<PeersData>(peersResponse, "Peers list API"),
    readJsonResponse<{ data?: CollectorInfo[] }>(collectorsResponse, "Collectors API"),
  ]);
  const collectorsData = collectorsResponseJson.data ?? [];

  const tabParam = url.searchParams.get("tab");
  let initialTab = 0;
  if (tabParam === "search") initialTab = 3;
  else if (tabParam === "selector") initialTab = 2;
  else if (
    tabParam === "peers" ||
    url.searchParams.has("asnModal") ||
    (url.searchParams.has("countryModal") && tabParam !== "collectors")
  ) {
    initialTab = 1;
  }

  const uniqueAsns = [...new Set(peersData.data.map((peer) => peer.asn))];
  const asnData = await fetchAsnInfoBatch(uniqueAsns, undefined, platform?.env);

  return {
    brokerData,
    peersData,
    asnData,
    collectorsData,
    initialTab,
  };
};
