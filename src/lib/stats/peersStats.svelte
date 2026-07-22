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
                    d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
            </svg>
            Full-feed Peers
        </div>
        <div class="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {fullFeedRis + fullFeedRv}<span
                class="text-lg font-normal text-base-content/45"
                >/{allRis + allRv}</span
            >
        </div>
        <div class="mt-1 text-xs text-base-content/55">
            RV {fullFeedRv} ({allRv}) · RIS {fullFeedRis} ({allRis})
        </div>
    {/if}
</div>
