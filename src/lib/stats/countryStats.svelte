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

<div class="flex-1 mx-auto stats shadow-lg">
    {#if isLoading}
        <div class="stat">
            <div class="stat-title">Country/Region Coverage</div>
            <div class="stat-value flex items-center gap-2">
                <span class="loading loading-spinner loading-md"></span>
            </div>
            <div class="stat-desc">Loading ASN data...</div>
        </div>
    {:else if !ready}
        <div class="stat">
            <div class="stat-title">Country/Region Coverage</div>
            <div class="stat-value">--</div>
            <div class="stat-desc">No ASN data available</div>
        </div>
    {:else}
        <div class="stat">
            <div class="stat-title">Country/Region Coverage</div>
            <div class="stat-value">{uniqueCountries}</div>
            <div class="stat-desc">from {totalAsns} ASNs</div>
            {#if topCountries.length > 0}
                <div class="stat-desc mt-2 flex flex-wrap gap-1">
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
