<script lang="ts">
    import filesize from "file-size";
    import type { CollectorInfo, ProjectFilter, DataTypeFilter } from "../types";
    import { sortCollectors, countryToFlag } from "../common";
    import { browser } from "$app/environment";

    interface MrtItem {
        ts_start: string;
        ts_end: string;
        collector_id: string;
        data_type: string;
        rough_size: number;
        exact_size: number;
        url: string;
    }

    interface SearchResult {
        count: number;
        page: number;
        page_size: number;
        data: MrtItem[];
    }

    let {
        collectorsData,
        isActive = true,
    }: {
        collectorsData: CollectorInfo[];
        isActive?: boolean;
    } = $props();

    // Sort collectors for dropdown
    let sortedCollectors = $derived(
        [...collectorsData].sort((a, b) => sortCollectors(a.name, b.name)),
    );

    // Search params — stored as RFC3339 strings (e.g. "2024-01-01T00:00:00Z")
    let tsStart = $state("");
    let tsEnd = $state("");
    let project = $state<ProjectFilter>("all");
    let collectorId = $state("");
    let dataType = $state<DataTypeFilter>("all");
    let pageSize = $state(100);

    // Returns today's date at 00:00:00 UTC as RFC3339
    function todayUtcRfc3339(): string {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = String(now.getUTCMonth() + 1).padStart(2, "0");
        const d = String(now.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}T00:00:00Z`;
    }

    // Convert RFC3339 → datetime-local value ("YYYY-MM-DDTHH:MM")
    function toPickerValue(rfc: string): string {
        if (!rfc) return "";
        return rfc.replace("Z", "").substring(0, 16).replace(" ", "T");
    }

    // Convert datetime-local value → RFC3339 ("YYYY-MM-DDTHH:MM:00Z")
    function fromPickerValue(v: string): string {
        if (!v) return "";
        const base = v.length === 16 ? v + ":00" : v;
        return base + "Z";
    }

    function handleStartPicker(e: Event) {
        const v = (e.target as HTMLInputElement).value;
        tsStart = fromPickerValue(v);
        // Push end time forward if it's now before start
        if (tsEnd && tsEnd < tsStart) {
            tsEnd = tsStart;
        }
    }

    function handleEndPicker(e: Event) {
        const v = (e.target as HTMLInputElement).value;
        tsEnd = fromPickerValue(v);
    }

    // Result state
    let results = $state<SearchResult | null>(null);
    let currentPage = $state(1);
    let loading = $state(false);
    let error = $state<string | null>(null);
    let hasSearched = $state(false);

    // Track URL init
    let initializedFromUrl = $state(false);

    $effect(() => {
        if (!browser || !isActive || initializedFromUrl) return;
        const url = new URL(window.location.href);
        const s = url.searchParams.get("mrt_ts_start");
        if (s) tsStart = s;
        const e = url.searchParams.get("mrt_ts_end");
        if (e) tsEnd = e;
        const p = url.searchParams.get("mrt_project") as ProjectFilter;
        if (p && ["all", "routeviews", "riperis"].includes(p)) project = p;
        const c = url.searchParams.get("mrt_collector");
        if (c) collectorId = c;
        const d = url.searchParams.get("mrt_data_type") as DataTypeFilter;
        if (d && ["all", "rib", "updates"].includes(d)) dataType = d;
        // Default to today 00:00:00Z if not set from URL
        if (!tsStart) tsStart = todayUtcRfc3339();
        if (!tsEnd) tsEnd = todayUtcRfc3339();
        initializedFromUrl = true;
    });

    $effect(() => {
        if (!browser || !isActive || !initializedFromUrl) return;
        const url = new URL(window.location.href);
        let changed = false;

        const setOrDelete = (key: string, value: string, def: string) => {
            if (value && value !== def) {
                if (url.searchParams.get(key) !== value) {
                    url.searchParams.set(key, value);
                    changed = true;
                }
            } else if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
                changed = true;
            }
        };

        setOrDelete("mrt_ts_start", tsStart, "");
        setOrDelete("mrt_ts_end", tsEnd, "");
        setOrDelete("mrt_project", project, "all");
        setOrDelete("mrt_collector", collectorId, "");
        setOrDelete("mrt_data_type", dataType, "all");

        if (changed) window.history.replaceState({}, "", url.toString());
    });

    async function search(page = 1) {
        loading = true;
        error = null;
        currentPage = page;

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("page_size", String(pageSize));
        if (tsStart) params.set("ts_start", tsStart);
        if (tsEnd) params.set("ts_end", tsEnd);
        if (project !== "all") params.set("project", project);
        if (collectorId) params.set("collector_id", collectorId);
        if (dataType !== "all") params.set("data_type", dataType);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            const resp = await fetch(
                `https://api.bgpkit.com/v3/broker/search?${params}`,
                { signal: controller.signal },
            );
            if (!resp.ok) throw new Error(`API error: ${resp.status}`);
            results = await resp.json();
            hasSearched = true;
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") {
                error = "Request timed out. Try a narrower time range.";
            } else {
                error = e instanceof Error ? e.message : "Search failed";
            }
            results = null;
        } finally {
            clearTimeout(timeout);
            loading = false;
        }
    }

    function clearFilters() {
        const today = todayUtcRfc3339();
        tsStart = today;
        tsEnd = today;
        project = "all";
        collectorId = "";
        dataType = "all";
        results = null;
        hasSearched = false;
        error = null;
    }

    function getCollectorFlag(id: string): string {
        const info = collectorsData?.find((c) => c.name === id);
        return info?.country ? countryToFlag(info.country) : "";
    }

    let totalPages = $derived(
        results ? Math.ceil(results.count / results.page_size) : 0,
    );

    function formatTs(ts: string): string {
        return ts.endsWith("Z") ? ts : ts + "Z";
    }
</script>

<div class="space-y-4">
    <!-- Search Form -->
    <div class="card bg-base-200 p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Start Time -->
            <div class="form-control">
                <label class="label" for="ts-start-picker">
                    <span class="label-text font-medium">Start Time (UTC)</span>
                </label>
                <input
                    id="ts-start-picker"
                    type="datetime-local"
                    class="input input-bordered input-sm"
                    value={toPickerValue(tsStart)}
                    onchange={handleStartPicker}
                />
                {#if tsStart}
                    <span class="text-xs font-mono text-base-content/50 mt-1 pl-1">{tsStart}</span>
                {/if}
            </div>

            <!-- End Time -->
            <div class="form-control">
                <label class="label" for="ts-end-picker">
                    <span class="label-text font-medium">End Time (UTC)</span>
                </label>
                <input
                    id="ts-end-picker"
                    type="datetime-local"
                    class="input input-bordered input-sm"
                    value={toPickerValue(tsEnd)}
                    min={toPickerValue(tsStart)}
                    onchange={handleEndPicker}
                />
                {#if tsEnd}
                    <span class="text-xs font-mono text-base-content/50 mt-1 pl-1">{tsEnd}</span>
                {/if}
            </div>

            <!-- Project -->
            <div class="form-control">
                <label class="label" for="mrt-project">
                    <span class="label-text font-medium">Project</span>
                </label>
                <select
                    id="mrt-project"
                    class="select select-bordered select-sm"
                    bind:value={project}
                >
                    <option value="all">All Projects</option>
                    <option value="routeviews">RouteViews</option>
                    <option value="riperis">RIPE RIS</option>
                </select>
            </div>

            <!-- Collector -->
            <div class="form-control">
                <label class="label" for="mrt-collector">
                    <span class="label-text font-medium">Collector</span>
                </label>
                <select
                    id="mrt-collector"
                    class="select select-bordered select-sm"
                    bind:value={collectorId}
                >
                    <option value="">All Collectors</option>
                    {#each sortedCollectors as c}
                        {@const flag = countryToFlag(c.country)}
                        <option value={c.name}
                            >{flag ? flag + " " : ""}{c.name}</option
                        >
                    {/each}
                </select>
            </div>

            <!-- Data Type -->
            <div class="form-control">
                <label class="label" for="mrt-data-type">
                    <span class="label-text font-medium">Data Type</span>
                </label>
                <select
                    id="mrt-data-type"
                    class="select select-bordered select-sm"
                    bind:value={dataType}
                >
                    <option value="all">All Types</option>
                    <option value="rib">RIB (snapshots)</option>
                    <option value="updates">Updates (changes)</option>
                </select>
            </div>

            <!-- Page Size -->
            <div class="form-control">
                <label class="label" for="mrt-page-size">
                    <span class="label-text font-medium">Results per page</span>
                </label>
                <select
                    id="mrt-page-size"
                    class="select select-bordered select-sm"
                    bind:value={pageSize}
                >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                </select>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 mt-4">
            <button
                class="btn btn-primary btn-sm"
                onclick={() => search(1)}
                disabled={loading}
            >
                {#if loading}
                    <span class="loading loading-spinner loading-xs"></span>
                {/if}
                Search
            </button>
            <button class="btn btn-ghost btn-sm" onclick={clearFilters}>
                Clear
            </button>
        </div>
    </div>

    <!-- Error -->
    {#if error}
        <div class="alert alert-error">
            <span>{error}</span>
        </div>
    {/if}

    <!-- Results -->
    {#if results}
        <div class="flex items-center justify-between text-sm text-base-content/70">
            <span>
                {results.count} file{results.count !== 1 ? "s" : ""} found
                {#if results.count > results.page_size}
                    — showing page {currentPage} of {totalPages}
                {/if}
            </span>
            {#if totalPages > 1}
                <div class="join">
                    <button
                        class="join-item btn btn-xs"
                        onclick={() => search(currentPage - 1)}
                        disabled={currentPage <= 1 || loading}
                    >
                        «
                    </button>
                    <button class="join-item btn btn-xs">
                        {currentPage} / {totalPages}
                    </button>
                    <button
                        class="join-item btn btn-xs"
                        onclick={() => search(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
                    >
                        »
                    </button>
                </div>
            {/if}
        </div>

        <div class="overflow-auto max-h-[65vh]">
            <table class="table table-bordered border-collapse border border-base-300 text-sm">
                <thead class="sticky top-0 z-10">
                    <tr class="border-b-2 border-base-300">
                        <th class="bg-base-200 border border-base-300">Collector</th>
                        <th class="bg-base-200 border border-base-300">Type</th>
                        <th class="bg-base-200 border border-base-300">File Start (UTC)</th>
                        <th class="bg-base-200 border border-base-300">File End (UTC)</th>
                        <th class="bg-base-200 border border-base-300">Size</th>
                        <th class="bg-base-200 border border-base-300">Download</th>
                    </tr>
                </thead>
                <tbody>
                    {#each results.data as item}
                        {@const flag = getCollectorFlag(item.collector_id)}
                        <tr class="hover:bg-base-200">
                            <td class="border border-base-300 font-mono">
                                {#if flag}
                                    <span class="mr-1">{flag}</span>
                                {/if}
                                {item.collector_id}
                            </td>
                            <td class="border border-base-300">
                                <span class="badge badge-ghost badge-sm text-xs">
                                    {item.data_type}
                                </span>
                            </td>
                            <td class="border border-base-300 whitespace-nowrap">
                                {formatTs(item.ts_start)}
                            </td>
                            <td class="border border-base-300 whitespace-nowrap">
                                {formatTs(item.ts_end)}
                            </td>
                            <td class="border border-base-300 whitespace-nowrap">
                                {item.exact_size
                                    ? filesize(item.exact_size).human("si")
                                    : filesize(item.rough_size).human("si")}
                            </td>
                            <td class="border border-base-300">
                                <a
                                    href={item.url}
                                    target="_blank"
                                    class="link link-primary text-xs"
                                >
                                    Download
                                </a>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        {#if results.data.length === 0}
            <div class="text-center py-8 text-base-content/60">
                No MRT files found for the given search criteria.
            </div>
        {/if}

        {#if totalPages > 1}
            <div class="flex justify-center mt-2">
                <div class="join">
                    <button
                        class="join-item btn btn-sm"
                        onclick={() => search(currentPage - 1)}
                        disabled={currentPage <= 1 || loading}
                    >
                        «
                    </button>
                    <button class="join-item btn btn-sm">
                        Page {currentPage} of {totalPages}
                    </button>
                    <button
                        class="join-item btn btn-sm"
                        onclick={() => search(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
                    >
                        »
                    </button>
                </div>
            </div>
        {/if}
    {:else if hasSearched && !loading}
        <div class="text-center py-8 text-base-content/60">
            No MRT files found for the given search criteria.
        </div>
    {:else if !hasSearched}
        <div class="text-center py-8 text-base-content/60">
            Set search parameters above and click <strong>Search</strong> to find MRT files.
        </div>
    {/if}

    {#if loading && !results}
        <div class="flex justify-center py-8">
            <span class="loading loading-dots loading-lg"></span>
        </div>
    {/if}
</div>
