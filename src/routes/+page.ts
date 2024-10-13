import type { BrokerData } from '../lib/types'; // Adjust the import path as needed

/** @type {import('./$types').PageLoad} */
export async function load(): Promise<BrokerData> {
    const res = await fetch("https://api.bgpkit.com/v3/broker/latest");
    const data: BrokerData = await res.json();
    return data;
}

