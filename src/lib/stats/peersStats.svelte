<script lang="ts">
    import type { PeersData, PeersDataEntry } from "$lib/types";

    let { peersData }: { peersData: PeersData } = $props();

    let { ready, fullFeedRv, allRv, fullFeedRis, allRis } = $derived.by(() => {
        let fullFeedRv = 0;
        let allRv = 0;
        let fullFeedRis = 0;
        let allRis = 0;

        peersData.data.forEach((entry: PeersDataEntry) => {
            if (entry.collector.startsWith("rrc")) {
                allRis += 1;
                if (
                    entry.num_v4_pfxs > 700_000 ||
                    entry.num_v6_pfxs > 100_000
                ) {
                    fullFeedRis += 1;
                }
            } else {
                allRv += 1;
                if (
                    entry.num_v4_pfxs > 700_000 ||
                    entry.num_v6_pfxs > 100_000
                ) {
                    fullFeedRv += 1;
                }
            }
        });
        return { ready: true, fullFeedRv, allRv, fullFeedRis, allRis };
    });
</script>

<div class="stats shadow-lg w-full sm:flex-1">
    {#if !ready}
        <span class="loading loading-dots loading-lg"></span>
    {:else}
        <div class="stat py-3 sm:py-4">
            <div class="stat-title text-xs sm:text-sm">Full-feed Peers</div>
            <div class="stat-value text-2xl sm:text-3xl">
                {fullFeedRis + fullFeedRv} <span class="text-base-content/50 text-lg">({allRis + allRv})</span>
            </div>
            <div class="stat-desc text-xs">RV: {fullFeedRv} ({allRv})</div>
            <div class="stat-desc text-xs">RIS: {fullFeedRis} ({allRis})</div>
        </div>
    {/if}
</div>
