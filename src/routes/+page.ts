import type { BrokerData, PeersData, AsnInfo } from "../lib/types";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }): Promise<{
  brokerData: BrokerData;
  peersData: PeersData;
  asnData: Map<number, AsnInfo>;
}> {
  // Fetch broker and peers data in parallel
  const [brokerResponse, peersResponse] = await Promise.all([
    fetch("https://api.bgpkit.com/v3/broker/latest"),
    fetch("https://api.bgpkit.com/v3/peers/list"),
  ]);

  const brokerData: BrokerData = await brokerResponse.json();
  const peersData: PeersData = await peersResponse.json();

  // Return empty ASN data - it will be loaded progressively on the client
  // This significantly improves initial page load time
  return {
    brokerData,
    peersData,
    asnData: new Map<number, AsnInfo>(),
  };
}
