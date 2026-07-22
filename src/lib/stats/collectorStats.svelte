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

<div class="rounded-lg border border-base-300 bg-base-100 p-4">
    {#if countRv + countRis === 0}
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
                    d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3M3.6 9h16.8M3.6 15h16.8"
                />
            </svg>
            Route Collectors
        </div>
        <div class="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {countRis + countRv}
        </div>
        <div class="mt-1 text-xs text-base-content/55">
            RouteViews {countRv} · RIPE RIS {countRis}
        </div>
    {/if}
</div>
