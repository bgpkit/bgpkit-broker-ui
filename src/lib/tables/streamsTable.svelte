<script lang="ts">
    import type { StreamsData } from "$lib/types";

    let { streamsData }: { streamsData: StreamsData | null } = $props();

    let search = $state("");
    let expanded = $state<Set<string>>(new Set());

    let filteredStreams = $derived.by(() => {
        if (!streamsData?.data) return [];
        const q = search.trim().toLowerCase();
        if (!q) return streamsData.data;
        return streamsData.data.filter((entry) =>
            entry.collector.toLowerCase().includes(q) ||
            entry.stream_collector.toLowerCase().includes(q) ||
            entry.wildcard_topic.toLowerCase().includes(q) ||
            entry.topics.some((topic) => topic.toLowerCase().includes(q)),
        );
    });

    function toggleExpanded(collector: string) {
        const next = new Set(expanded);
        if (next.has(collector)) {
            next.delete(collector);
        } else {
            next.add(collector);
        }
        expanded = next;
    }
</script>

{#if !streamsData}
    <div class="text-center py-8 text-base-content/60">
        RouteViews stream metadata is unavailable.
    </div>
{:else}
    <div class="flex flex-col gap-4 mb-4">
        <div class="stats stats-vertical lg:stats-horizontal shadow bg-base-200">
            <div class="stat">
                <div class="stat-title">Stream Collectors</div>
                <div class="stat-value text-2xl">{streamsData.meta.collector_count}</div>
            </div>
            <div class="stat">
                <div class="stat-title">Kafka Topics</div>
                <div class="stat-value text-2xl">{streamsData.meta.topic_count.toLocaleString()}</div>
            </div>
            <div class="stat">
                <div class="stat-title">Fetched</div>
                <div class="stat-value text-sm">{streamsData.meta.fetched_at.replace("T", " ").replace("Z", " UTC")}</div>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-4">
            <input
                type="text"
                class="input input-bordered flex-1 min-w-64"
                placeholder="Search collector or Kafka topic..."
                bind:value={search}
            />
            <div class="text-sm text-base-content/70">
                Showing <span class="font-semibold">{filteredStreams.length}</span> of
                <span class="font-semibold">{streamsData.count}</span> collectors
            </div>
        </div>
    </div>

    <div class="overflow-auto max-h-[70vh]">
        <table class="table table-bordered border-collapse border border-base-300">
            <thead class="sticky top-0 z-10">
                <tr class="border-b-2 border-base-300">
                    <th class="bg-base-200 border border-base-300">Collector</th>
                    <th class="bg-base-200 border border-base-300">Stream Collector</th>
                    <th class="bg-base-200 border border-base-300">Wildcard Topic</th>
                    <th class="bg-base-200 border border-base-300">Topics</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredStreams as entry}
                    {@const isExpanded = expanded.has(entry.collector)}
                    <tr class="hover:bg-base-200">
                        <td class="border border-base-300 font-mono text-sm">{entry.collector}</td>
                        <td class="border border-base-300 font-mono text-sm">{entry.stream_collector}</td>
                        <td class="border border-base-300 font-mono text-xs">{entry.wildcard_topic}</td>
                        <td class="border border-base-300">
                            <button class="btn btn-xs btn-ghost" onclick={() => toggleExpanded(entry.collector)}>
                                {entry.topics.length.toLocaleString()} topics {isExpanded ? "▲" : "▼"}
                            </button>
                            {#if isExpanded}
                                <div class="mt-2 max-h-48 overflow-auto rounded bg-base-200 p-2 font-mono text-xs">
                                    {#each entry.topics as topic}
                                        <div>{topic}</div>
                                    {/each}
                                </div>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}
