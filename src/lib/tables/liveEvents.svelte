<script lang="ts">
    import type { BrokerDataEntry } from "$lib/types";
    import filesize from "file-size";

    type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

    let collector = $state("");
    let dataType = $state<"" | "rib" | "updates">("");
    let status = $state<ConnectionStatus>("idle");
    let events = $state<BrokerDataEntry[]>([]);
    let eventSource: EventSource | null = null;

    let statusClass = $derived(
        status === "connected" ? "badge-success" : status === "error" ? "badge-error" : "badge-ghost",
    );

    function buildEventsUrl(): string {
        const url = new URL("https://api.bgpkit.com/v3/broker/events");
        if (collector.trim()) url.searchParams.set("collector_id", collector.trim());
        if (dataType) url.searchParams.set("data_type", dataType);
        return url.toString();
    }

    function disconnect() {
        eventSource?.close();
        eventSource = null;
        status = "idle";
    }

    function connect() {
        disconnect();
        status = "connecting";
        const source = new EventSource(buildEventsUrl());
        eventSource = source;

        source.onopen = () => {
            status = "connected";
        };

        source.addEventListener("new_file", (event) => {
            const message = event as MessageEvent<string>;
            const entry = JSON.parse(message.data) as BrokerDataEntry;
            events = [entry, ...events].slice(0, 100);
        });

        source.onerror = () => {
            status = "error";
        };
    }

    function clearEvents() {
        events = [];
    }

    $effect(() => {
        return () => disconnect();
    });
</script>

<div class="flex flex-col gap-4">
    <div class="alert alert-info">
        <span>Live stream uses the BGPKIT SSE endpoint and shows new MRT files as collectors publish them.</span>
    </div>

    <div class="flex flex-wrap items-center gap-3">
        <input
            class="input input-bordered min-w-64"
            placeholder="Collector filter, e.g. rrc23"
            bind:value={collector}
            disabled={status === "connected" || status === "connecting"}
        />
        <select
            class="select select-bordered"
            bind:value={dataType}
            disabled={status === "connected" || status === "connecting"}
        >
            <option value="">All data types</option>
            <option value="rib">RIB</option>
            <option value="updates">Updates</option>
        </select>
        {#if status === "connected" || status === "connecting"}
            <button class="btn btn-error" onclick={disconnect}>Disconnect</button>
        {:else}
            <button class="btn btn-primary" onclick={connect}>Connect</button>
        {/if}
        <button class="btn btn-ghost" onclick={clearEvents} disabled={events.length === 0}>Clear</button>
        <span class="badge {statusClass}">{status}</span>
    </div>

    <div class="overflow-auto max-h-[70vh]">
        <table class="table table-bordered border-collapse border border-base-300">
            <thead class="sticky top-0 z-10">
                <tr class="border-b-2 border-base-300">
                    <th class="bg-base-200 border border-base-300">Collector</th>
                    <th class="bg-base-200 border border-base-300">Type</th>
                    <th class="bg-base-200 border border-base-300">File Time UTC</th>
                    <th class="bg-base-200 border border-base-300">Size</th>
                    <th class="bg-base-200 border border-base-300">Latest</th>
                </tr>
            </thead>
            <tbody>
                {#each events as entry, index (`${entry.url}-${index}`)}
                    <tr class="hover:bg-base-200">
                        <td class="border border-base-300 font-mono text-sm">{entry.collector_id}</td>
                        <td class="border border-base-300">
                            <span class="badge badge-sm {entry.data_type === 'rib' ? 'badge-info' : 'badge-warning'}">
                                {entry.data_type}
                            </span>
                        </td>
                        <td class="border border-base-300 font-mono text-xs">{entry.ts_start.replace("T", " ")}</td>
                        <td class="border border-base-300">{filesize(entry.rough_size).human("si")}</td>
                        <td class="border border-base-300">
                            <a class="link link-primary" href={entry.url} target="_blank">Download</a>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    {#if events.length === 0}
        <div class="text-center py-8 text-base-content/60">
            No live events yet. Connect and wait for new MRT files.
        </div>
    {/if}
</div>
