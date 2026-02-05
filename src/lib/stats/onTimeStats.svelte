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

<div class="stats shadow-lg w-full sm:flex-1">
    {#if !ready}
        <span class="loading loading-dots loading-lg"></span>
    {:else}
        <div class="stat py-3 sm:py-4">
            <div class="stat-title text-xs sm:text-sm">Data On-time Rate</div>
            <div class="stat-value text-2xl sm:text-3xl">{(onTimeRate * 100).toFixed(1)}%</div>
            {#if delayed.length === 0}
                <div class="inline-flex items-center space-x-2">
                    <div class="inline-grid *:[grid-area:1/1]">
                        <div class="status status-success animate-ping"></div>
                        <div class="status status-success"></div>
                    </div>
                    <div class="stat-desc text-xs">All on time</div>
                </div>
            {:else}
                <div class="inline-flex items-center space-x-2">
                    <div class="inline-grid *:[grid-area:1/1]">
                        <div class="status status-error animate-ping"></div>
                        <div class="status status-error"></div>
                    </div>
                    <div class="stat-desc text-xs">Delayed: {delayed.slice(0, 2).join(", ")}{delayed.length > 2 ? "..." : ""}</div>
                </div>
            {/if}
        </div>
    {/if}
</div>
