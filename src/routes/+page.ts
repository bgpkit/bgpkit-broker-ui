import type { BrokerData, CombinedData } from '../lib/types'; // Adjust the import path as needed

/** @type {import('./$types').PageLoad} */
export async function load(): Promise<CombinedData> {
    const brokerData: BrokerData = await (await fetch("https://api.bgpkit.com/v3/broker/latest")).json();
    const peersData = await (await fetch("https://api.bgpkit.com/v3/peers/list")).json();
    return { brokerData, peersData };
}