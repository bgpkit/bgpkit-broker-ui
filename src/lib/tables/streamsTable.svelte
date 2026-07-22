<script lang="ts">
    import type { StreamsData } from "$lib/types";

    let { streamsData }: { streamsData: StreamsData | null } = $props();

    let search = $state("");
    let expanded = $state<Set<string>>(new Set());
    let copiedTopic = $state<string | null>(null);

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

    async function copyTopic(topic: string) {
        try {
            await navigator.clipboard.writeText(topic);
            copiedTopic = topic;
            setTimeout(() => {
                if (copiedTopic === topic) copiedTopic = null;
            }, 1500);
        } catch (error) {
            console.error("Failed to copy topic:", error);
        }
    }
</script>

{#if !streamsData}
    <div class="text-center py-8 text-base-content/60">
        RouteViews stream metadata is unavailable.
    </div>
{:else}
    <div class="flex flex-col gap-4 mb-4">
        <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border border-base-300 bg-base-100 p-4">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-base-content/55">
                    Stream Collectors
                </div>
                <div class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                    {streamsData.meta.collector_count}
                </div>
            </div>
            <div class="rounded-lg border border-base-300 bg-base-100 p-4">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-base-content/55">
                    Kafka Topics
                </div>
                <div class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                    {streamsData.meta.topic_count.toLocaleString()}
                </div>
            </div>
            <div class="rounded-lg border border-base-300 bg-base-100 p-4">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-base-content/55">
                    Fetched
                </div>
                <div class="mt-1 font-mono text-sm">
                    {streamsData.meta.fetched_at.replace("T", " ").replace("Z", " UTC")}
                </div>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-4">
            <input
                type="text"
                class="input input-bordered flex-1 min-w-64"
                placeholder="Search collector or Kafka topic..."
                bind:value={search}
            />
            <div class="text-sm text-base-content/70 tabular-nums">
                Showing <span class="font-semibold">{filteredStreams.length}</span> of
                <span class="font-semibold">{streamsData.count}</span> collectors
            </div>
        </div>
    </div>

    <div class="overflow-auto max-h-[70vh]">
        <table class="table data-table">
            <thead class="sticky top-0 z-10">
                <tr class="border-b border-base-300">
                    <th class="bg-base-200 ">Collector</th>
                    <th class="bg-base-200 ">Stream Collector</th>
                    <th class="bg-base-200 ">Wildcard Topic</th>
                    <th class="bg-base-200 ">Topics</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredStreams as entry}
                    {@const isExpanded = expanded.has(entry.collector)}
                    <tr class="hover:bg-base-200">
                        <td class=" font-mono text-sm">{entry.collector}</td>
                        <td class=" font-mono text-sm">{entry.stream_collector}</td>
                        <td class=" font-mono text-xs">
                            <button
                                class="inline-flex items-center gap-1 hover:text-primary"
                                title="Click to copy topic"
                                onclick={() => copyTopic(entry.wildcard_topic)}
                            >
                                {entry.wildcard_topic}
                                {#if copiedTopic === entry.wildcard_topic}
                                    <span class="text-success text-[10px] font-sans">copied</span>
                                {:else}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke-width="1.5"
                                        stroke="currentColor"
                                        class="h-3.5 w-3.5 opacity-40"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"
                                        />
                                    </svg>
                                {/if}
                            </button>
                        </td>
                        <td class="">
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
