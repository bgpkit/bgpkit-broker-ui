<script lang="ts">
    import type { BrokerData, BrokerDataEntry } from "$lib/types";

    let { brokerData }: { brokerData: BrokerData } = $props();
    let { countRv, countRis } = $derived.by(() => {
        let countRv = 0;
        let countRis = 0;
        brokerData.data.forEach((entry: BrokerDataEntry) => {
            if (entry.data_type === "rib") {
                if (entry.collector_id.includes("rrc")) {
                    countRis += 1;
                } else {
                    countRv += 1;
                }
            }
        });
        return { countRv, countRis };
    });
</script>

<div class="flex-1 mx-auto stats shadow-lg">
    {#if countRv + countRis === 0}
        <span class="loading loading-dots loading-lg"></span>
    {:else}
        <div class="stat">
            <div class="stat-title">Route Collectors</div>
            <div class="stat-value">{countRis + countRv}</div>
            <div class="stat-desc">RouteViews {countRv}</div>
            <div class="stat-desc">RIPE RIS {countRis}</div>
        </div>
    {/if}
</div>
