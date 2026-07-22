<script lang="ts">
    import { DECOMMISSIONED_COLLECTORS, fileDelayed } from "$lib/common";
    import type { BrokerData, BrokerDataEntry } from "$lib/types";

    let { brokerData }: { brokerData: BrokerData } = $props();

    let { delayed, onTimeRate, ready } = $derived.by(() => {
        let delayed: string[] = [];
        let total = 0;

        brokerData.data.forEach((entry: BrokerDataEntry) => {
            if (!DECOMMISSIONED_COLLECTORS.includes(entry.collector_id)) {
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

<div class="rounded-lg border border-base-300 bg-base-100 p-4">
    {#if !ready}
        <div class="flex justify-center py-4">
            <span class="loading loading-dots loading-md"></span>
        </div>
    {:else}
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
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
            </svg>
            Data On-time Rate
        </div>
        <div class="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {(onTimeRate * 100).toFixed(1)}%
        </div>
        <div class="mt-1 flex items-center gap-1.5 text-xs text-base-content/55">
            {#if delayed.length === 0}
                <span class="status status-success status-sm"></span>
                All on time
            {:else}
                <span class="status status-error status-sm"></span>
                Delayed: {delayed.slice(0, 2).join(", ")}{delayed.length > 2 ? "…" : ""}
            {/if}
        </div>
    {/if}
</div>
