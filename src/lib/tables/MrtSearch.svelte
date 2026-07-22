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

    // Returns the current time as RFC3339 (seconds precision)
    function nowUtcRfc3339(): string {
        return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    }

    // RFC3339 → "YYYY-MM-DD" for date input
    function toDateValue(rfc: string): string {
        if (!rfc) return "";
        return rfc.substring(0, 10);
    }

    // RFC3339 → "HH:MM" for time input
    function toTimeValue(rfc: string): string {
        if (!rfc) return "";
        return rfc.substring(11, 16);
    }

    // date ("YYYY-MM-DD") + time ("HH:MM") → RFC3339
    function fromDateTimeValues(date: string, time: string): string {
        if (!date) return "";
        return `${date}T${time || "00:00"}:00Z`;
    }

    function handleStartDate(e: Event) {
        const date = (e.target as HTMLInputElement).value;
        const time = toTimeValue(tsStart) || "00:00";
        tsStart = fromDateTimeValues(date, time);
        if (tsEnd && tsEnd < tsStart) tsEnd = tsStart;
        updateUrl();
    }

    function handleStartTime(e: Event) {
        const raw = (e.target as HTMLInputElement).value;
        const time = normaliseTime(raw);
        const date = toDateValue(tsStart) || toDateValue(todayUtcRfc3339());
        if (time) tsStart = fromDateTimeValues(date, time);
        if (tsEnd && tsEnd < tsStart) tsEnd = tsStart;
        updateUrl();
    }

    function handleEndDate(e: Event) {
        const date = (e.target as HTMLInputElement).value;
        const time = toTimeValue(tsEnd) || "00:00";
        tsEnd = fromDateTimeValues(date, time);
        if (tsStart && tsEnd < tsStart) tsEnd = tsStart;
        updateUrl();
    }

    function handleEndTime(e: Event) {
        const raw = (e.target as HTMLInputElement).value;
        const time = normaliseTime(raw);
        const date = toDateValue(tsEnd) || toDateValue(tsStart) || toDateValue(todayUtcRfc3339());
        if (time) tsEnd = fromDateTimeValues(date, time);
        if (tsStart && tsEnd < tsStart) tsEnd = tsStart;
        updateUrl();
    }

    // Validate / normalise a typed time string like "830", "8:30", "08:30" → "08:30"
    function normaliseTime(raw: string): string {
        const s = raw.replace(/[^\d:]/g, "");
        const m = s.match(/^(\d{1,2}):?(\d{2})$/);
        if (!m) return "";
        const h = parseInt(m[1]);
        const min = parseInt(m[2]);
        if (h > 23 || min > 59) return "";
        return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }

    // End date min: start date
    let endDateMin = $derived(toDateValue(tsStart));

    // Result state
    let results = $state<SearchResult | null>(null);
    let currentPage = $state(1);
    let loading = $state(false);
    let error = $state<string | null>(null);
    let hasSearched = $state(false);

    function isValidTimestamp(s: string): boolean {
        if (!s) return false;
        return !isNaN(new Date(s).getTime());
    }

    // Track URL init
    let initializedFromUrl = $state(false);

    $effect(() => {
        if (!browser || !isActive || initializedFromUrl) return;
        initializedFromUrl = true;

        const url = new URL(window.location.href);
        let hadParams = false;
        let allValid = true;
        let urlChanged = false;

        const s = url.searchParams.get("mrt_ts_start");
        if (s !== null) {
            hadParams = true;
            if (isValidTimestamp(s)) { tsStart = s; }
            else { url.searchParams.delete("mrt_ts_start"); urlChanged = true; allValid = false; }
        }

        const e = url.searchParams.get("mrt_ts_end");
        if (e !== null) {
            hadParams = true;
            if (isValidTimestamp(e)) { tsEnd = e; }
            else { url.searchParams.delete("mrt_ts_end"); urlChanged = true; allValid = false; }
        }

        const p = url.searchParams.get("mrt_project");
        if (p !== null) {
            hadParams = true;
            if (["all", "routeviews", "riperis"].includes(p)) { project = p as ProjectFilter; }
            else { url.searchParams.delete("mrt_project"); urlChanged = true; allValid = false; }
        }

        const c = url.searchParams.get("mrt_collector");
        if (c !== null) {
            hadParams = true;
            if (collectorsData.some(col => col.name === c)) { collectorId = c; }
            else { url.searchParams.delete("mrt_collector"); urlChanged = true; allValid = false; }
        }

        const d = url.searchParams.get("mrt_data_type");
        if (d !== null) {
            hadParams = true;
            if (["all", "rib", "updates"].includes(d)) { dataType = d as DataTypeFilter; }
            else { url.searchParams.delete("mrt_data_type"); urlChanged = true; allValid = false; }
        }

        if (!tsStart) tsStart = todayUtcRfc3339();
        if (!tsEnd) tsEnd = nowUtcRfc3339();

        if (urlChanged) window.history.replaceState({}, "", url.toString());

        if (hadParams && allValid) search(1);
    });

    function updateUrl() {
        if (!browser) return;
        const url = new URL(window.location.href);
        if (tsStart) url.searchParams.set("mrt_ts_start", tsStart); else url.searchParams.delete("mrt_ts_start");
        if (tsEnd) url.searchParams.set("mrt_ts_end", tsEnd); else url.searchParams.delete("mrt_ts_end");
        if (project !== "all") url.searchParams.set("mrt_project", project); else url.searchParams.delete("mrt_project");
        if (collectorId) url.searchParams.set("mrt_collector", collectorId); else url.searchParams.delete("mrt_collector");
        if (dataType !== "all") url.searchParams.set("mrt_data_type", dataType); else url.searchParams.delete("mrt_data_type");
        window.history.replaceState({}, "", url.toString());
    }

    async function search(page = 1) {
        updateUrl();
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
        tsStart = todayUtcRfc3339();
        tsEnd = nowUtcRfc3339();
        project = "all";
        collectorId = "";
        dataType = "all";
        results = null;
        hasSearched = false;
        error = null;
        if (browser) {
            const url = new URL(window.location.href);
            ["mrt_ts_start", "mrt_ts_end", "mrt_project", "mrt_collector", "mrt_data_type"].forEach(k => url.searchParams.delete(k));
            window.history.replaceState({}, "", url.toString());
        }
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
                <label for="start-date" class="label">
                    <span class="label-text font-medium">Start Time (UTC)</span>
                </label>
                <div class="flex gap-1">
                    <input
                        id="start-date"
                        type="date"
                        class="input input-bordered input-sm flex-1"
                        value={toDateValue(tsStart)}
                        onchange={handleStartDate}
                    />
                    <input
                        type="text"
                        class="input input-bordered input-sm w-24 font-mono"
                        placeholder="HH:MM"
                        value={toTimeValue(tsStart)}
                        onchange={handleStartTime}
                    />
                </div>
                {#if tsStart}
                    <span class="text-xs font-mono text-base-content/50 mt-1 pl-1">{tsStart}</span>
                {/if}
            </div>

            <!-- End Time -->
            <div class="form-control">
                <label for="end-date" class="label">
                    <span class="label-text font-medium">End Time (UTC)</span>
                </label>
                <div class="flex gap-1">
                    <input
                        id="end-date"
                        type="date"
                        class="input input-bordered input-sm flex-1"
                        value={toDateValue(tsEnd)}
                        min={endDateMin}
                        onchange={handleEndDate}
                    />
                    <input
                        type="text"
                        class="input input-bordered input-sm w-24 font-mono"
                        placeholder="HH:MM"
                        value={toTimeValue(tsEnd)}
                        onchange={handleEndTime}
                    />
                </div>
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
            <table class="table data-table text-sm">
                <thead class="sticky top-0 z-10">
                    <tr class="border-b border-base-300">
                        <th class="bg-base-200 ">Collector</th>
                        <th class="bg-base-200 ">Type</th>
                        <th class="bg-base-200 ">File Start (UTC)</th>
                        <th class="bg-base-200 ">File End (UTC)</th>
                        <th class="bg-base-200 ">Size</th>
                        <th class="bg-base-200 ">Download</th>
                    </tr>
                </thead>
                <tbody>
                    {#each results.data as item}
                        {@const flag = getCollectorFlag(item.collector_id)}
                        <tr class="hover:bg-base-200">
                            <td class=" font-mono">
                                {#if flag}
                                    <span class="mr-1">{flag}</span>
                                {/if}
                                {item.collector_id}
                            </td>
                            <td class="">
                                <span class="badge badge-ghost badge-sm text-xs">
                                    {item.data_type}
                                </span>
                            </td>
                            <td class=" whitespace-nowrap">
                                {formatTs(item.ts_start)}
                            </td>
                            <td class=" whitespace-nowrap">
                                {formatTs(item.ts_end)}
                            </td>
                            <td class=" whitespace-nowrap">
                                {item.exact_size
                                    ? filesize(item.exact_size).human("si")
                                    : filesize(item.rough_size).human("si")}
                            </td>
                            <td class="">
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
