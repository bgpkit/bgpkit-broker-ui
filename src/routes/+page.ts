import type { BrokerData, PeersData, AsnInfo, CollectorInfo } from "../lib/types";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }): Promise<{
  brokerData: BrokerData;
  peersData: PeersData;
  asnData: Map<number, AsnInfo>;
  collectorsData: CollectorInfo[];
}> {
  // Fetch broker, peers, and collectors data in parallel
  const [brokerResponse, peersResponse, collectorsResponse] = await Promise.all([
    fetch("https://api.bgpkit.com/v3/broker/latest"),
    fetch("https://api.bgpkit.com/v3/peers/list"),
    fetch("https://api.bgpkit.com/v3/broker/collectors"),
  ]);

  const brokerData: BrokerData = await brokerResponse.json();
  const peersData: PeersData = await peersResponse.json();
  const collectorsResponseJson: { data: CollectorInfo[] } = await collectorsResponse.json();
  const collectorsData: CollectorInfo[] = collectorsResponseJson.data || [];

  // Return empty ASN data - it will be loaded progressively on the client
  // This significantly improves initial page load time
  return {
    brokerData,
    peersData,
    asnData: new Map<number, AsnInfo>(),
    collectorsData,
  };
}
