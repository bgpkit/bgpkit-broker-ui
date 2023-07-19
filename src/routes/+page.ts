/** @type {import('./$types').PageLoad} */
export async function load() {
    const res = await fetch ("https://api.broker.bgpkit.com/v3/latest")
    const data = await res.json();
    return data;
}