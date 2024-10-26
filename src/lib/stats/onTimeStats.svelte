<script lang="ts">
    import { DEPRECATED_COLLECTORS, fileDelayed } from "$lib/common";
    import type { BrokerData, BrokerDataEntry } from "$lib/types";

    let { brokerData }: { brokerData: BrokerData } = $props();

    let { delayed, onTimeRate, ready } = $derived.by(() => {
        let delayed: string[] = [];
        let total = 0;

        brokerData.data.forEach((entry: BrokerDataEntry) => {
            if (!DEPRECATED_COLLECTORS.includes(entry.collector_id)) {
                total += 1;
                if (fileDelayed(entry.delay, entry.data_type)) {
                    delayed.push(`${entry.collector_id}_${entry.data_type}`);
                }
            }
        });

        let onTimeRate = (total - delayed.length) / total;
        return { delayed, onTimeRate, ready: true };
    });
</script>

<div class="flex-1 mx-auto stats shadow-lg">
    {#if !ready}
        <span class="loading loading-dots loading-lg"></span>
    {:else}
        <div class="stat">
            <div class="stat-title">Date On-time Rate</div>
            <div class="stat-value">{(onTimeRate * 100).toFixed(1)}%</div>
            {#if delayed.length === 0}
                <div class="stat-desc">All on time</div>
            {:else}
                <div class="stat-desc">Delayed: {delayed}</div>
            {/if}
        </div>
    {/if}
</div>
