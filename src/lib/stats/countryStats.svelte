<script lang="ts">
    import type { PeersData, PeersDataEntry, AsnInfo } from "$lib/types";
    import { countryToFlag } from "$lib/common";

    let {
        peersData,
        asnData,
        isLoading = false,
    }: {
        peersData: PeersData;
        asnData: Map<number, AsnInfo>;
        isLoading?: boolean;
    } = $props();

    let { ready, uniqueCountries, topCountries, totalAsns } = $derived.by(
        () => {
            if (!peersData?.data || asnData.size === 0) {
                return {
                    ready: false,
                    uniqueCountries: 0,
                    topCountries: [] as { country: string; count: number }[],
                    totalAsns: 0,
                };
            }

            const countryCounts = new Map<string, number>();
            const seenAsns = new Set<number>();

            peersData.data.forEach((entry: PeersDataEntry) => {
                if (!seenAsns.has(entry.asn)) {
                    seenAsns.add(entry.asn);
                    const asnInfo = asnData.get(entry.asn);
                    if (asnInfo?.country) {
                        countryCounts.set(
                            asnInfo.country,
                            (countryCounts.get(asnInfo.country) || 0) + 1,
                        );
                    }
                }
            });

            const topCountries = Array.from(countryCounts.entries())
                .map(([country, count]) => ({ country, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6);

            return {
                ready: true,
                uniqueCountries: countryCounts.size,
                topCountries,
                totalAsns: seenAsns.size,
            };
        },
    );
</script>

<div class="rounded-lg border border-base-300 bg-base-100 p-4">
    <div
        class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-base-content/55"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-3.5 w-3.5"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
            />
        </svg>
        Peer AS Country/Region
    </div>
    {#if isLoading}
        <div class="mt-2 flex items-center gap-2 py-1">
            <span class="loading loading-spinner loading-sm"></span>
        </div>
        <div class="mt-1 text-xs text-base-content/55">Loading ASN data...</div>
    {:else if !ready}
        <div class="mt-2 text-3xl font-semibold tracking-tight tabular-nums">--</div>
        <div class="mt-1 text-xs text-base-content/55">No ASN data available</div>
    {:else}
        <div class="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {uniqueCountries}
        </div>
        <div class="mt-1 text-xs text-base-content/55">from {totalAsns} peer ASNs</div>
        {#if topCountries.length > 0}
            <div class="mt-2 flex flex-wrap gap-1">
                {#each topCountries as { country, count }}
                    <span
                        class="badge badge-sm badge-ghost gap-1"
                        title="{count} ASNs from {country}"
                    >
                        {countryToFlag(country)}
                        {country}
                        <span class="opacity-60">({count})</span>
                    </span>
                {/each}
            </div>
        {/if}
    {/if}
</div>
