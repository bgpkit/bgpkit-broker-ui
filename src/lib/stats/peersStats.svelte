<script lang="ts">
    import { DEPRECATED_COLLECTORS, fileDelayed } from "$lib/common";
    import type {
        BrokerData,
        BrokerDataEntry,
        PeersData,
        PeersDataEntry,
    } from "$lib/types";

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

<div class="flex-1 mx-auto stats shadow-lg">
    {#if !ready}
        <span class="loading loading-dots loading-lg"></span>
    {:else}
        <div class="stat">
            <div class="stat-title">Full-feed Collector Peers</div>
            <div class="stat-value">
                {fullFeedRis + fullFeedRv} ({allRis + allRv})
            </div>
            <div class="stat-desc">RouteViews: {fullFeedRv} ({allRv})</div>
            <div class="stat-desc">RIPE RIS: {fullFeedRis} ({allRis})</div>
        </div>
    {/if}
</div>
