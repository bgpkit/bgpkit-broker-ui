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

<div class="stats shadow-lg w-full sm:flex-1">
    {#if isLoading}
        <div class="stat py-3 sm:py-4">
            <div class="stat-title text-xs sm:text-sm">Peer AS Country/Region</div>
            <div class="stat-value flex items-center gap-2">
                <span class="loading loading-spinner loading-md"></span>
            </div>
            <div class="stat-desc text-xs">Loading ASN data...</div>
        </div>
    {:else if !ready}
        <div class="stat py-3 sm:py-4">
            <div class="stat-title text-xs sm:text-sm">Peer AS Country/Region</div>
            <div class="stat-value">--</div>
            <div class="stat-desc text-xs">No ASN data available</div>
        </div>
    {:else}
        <div class="stat py-3 sm:py-4">
            <div class="stat-title text-xs sm:text-sm">Peer AS Country/Region</div>
            <div class="stat-value text-2xl sm:text-3xl">{uniqueCountries}</div>
            <div class="stat-desc text-xs">from {totalAsns} peer ASNs</div>
            {#if topCountries.length > 0}
                <div class="stat-desc mt-1 flex flex-wrap gap-1">
                    {#each topCountries as { country, count }}
                        <span
                            class="badge badge-sm gap-1"
                            title="{count} ASNs from {country}"
                        >
                            {countryToFlag(country)}
                            {country}
                            <span class="opacity-70">({count})</span>
                        </span>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
