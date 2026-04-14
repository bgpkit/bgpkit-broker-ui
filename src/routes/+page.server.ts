// @ts-nocheck - Platform types not available in generated $types
import type { BrokerData, PeersData, AsnInfo, CollectorInfo } from "../lib/types";
import { fetchAsnInfoBatch } from "../lib/common";

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, url, platform }): Promise<{
  brokerData: BrokerData;
  peersData: PeersData;
  asnData: Map<number, AsnInfo>;
  collectorsData: CollectorInfo[];
  initialTab: number;
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

  const tabParam = url.searchParams.get("tab");
  let initialTab = 0;
  if (tabParam === "search") initialTab = 3;
  else if (tabParam === "selector") initialTab = 2;
  else if (tabParam === "peers" || url.searchParams.has("asnModal") || (url.searchParams.has("countryModal") && tabParam !== "collectors")) initialTab = 1;

  // Fetch ASN data server-side with KV caching
  // This allows KV to cache results and avoids client-side API calls
  const loadStartTime = performance.now();
  const uniqueAsns = [...new Set(peersData.data.map((p: { asn: number }) => p.asn))];
  console.log(`[Server] Starting ASN load for ${uniqueAsns.length} unique ASNs...`);

  const asnData = await fetchAsnInfoBatch(
    uniqueAsns,
    undefined,
    platform?.env as { ASN_CACHE?: KVNamespace } | undefined
  );

  const duration = performance.now() - loadStartTime;
  console.log(`[Server] ASN loading complete: ${asnData.size} ASNs in ${duration.toFixed(1)}ms`);

  return {
    brokerData,
    peersData,
    asnData,
    collectorsData,
    initialTab,
  };
}
