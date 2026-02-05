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

<div class="stats shadow-lg w-full sm:flex-1">
    {#if countRv + countRis === 0}
        <span class="loading loading-dots loading-lg"></span>
    {:else}
        <div class="stat py-3 sm:py-4">
            <div class="stat-title text-xs sm:text-sm">Route Collectors</div>
            <div class="stat-value text-2xl sm:text-3xl">{countRis + countRv}</div>
            <div class="stat-desc text-xs">RouteViews {countRv}</div>
            <div class="stat-desc text-xs">RIPE RIS {countRis}</div>
        </div>
    {/if}
</div>
