<script lang="ts">
    import filesize from "file-size";
    import pkg from "moment/moment";
    const { duration } = pkg;
    import type {
        BrokerData,
        BrokerDataEntry,
        PeersData,
        AsnInfo,
        ProjectFilter,
        DataTypeFilter,
        StatusFilter,
    } from "../types";
    import {
        DEPRECATED_COLLECTORS,
        fileDelayed,
        filterBrokerData,
        buildCollectorSummary,
        sortCollectors,
        getCollectorStatus,
    } from "../common";
    import FilterBar from "../components/FilterBar.svelte";
    import CollectorModal from "../components/CollectorModal.svelte";
    import CountryModal from "../components/CountryModal.svelte";
    import { buildCountrySummary } from "../common";

    let {
        brokerData,
        peersData,
        asnData,
        isActive = true,
        onNavigateToPeers,
        onNavigateToCountry,
    }: {
        brokerData: BrokerData;
        peersData: PeersData;
        asnData: Map<number, AsnInfo>;
        isActive?: boolean;
        onNavigateToPeers?: (collector: string) => void;
        onNavigateToCountry?: (country: string) => void;
    } = $props();

    const entries: BrokerDataEntry[] = $derived(
        [...brokerData.data].sort((a, b) =>
            sortCollectors(a.collector_id, b.collector_id),
        ),
    );

    // Filter state
    let search = $state("");
    let project = $state<ProjectFilter>("all");
    let dataType = $state<DataTypeFilter>("all");
    let status = $state<StatusFilter>("all");
    let showDeprecated = $state(false);

    // Track if initial URL params have been processed
    let initializedFromUrl = $state(false);

    // Filtered entries
    let filteredEntries = $derived(
        filterBrokerData(
            entries,
            search,
            project,
            dataType,
            status,
            showDeprecated,
        ),
    );

    // Group entries by collector for merged display
    type CollectorGroup = {
        collector_id: string;
        rib?: BrokerDataEntry;
        updates?: BrokerDataEntry;
        status: "ok" | "delayed" | "deprecated";
    };

    let groupedEntries = $derived.by(() => {
        const groups = new Map<string, CollectorGroup>();

        // First pass: group by collector
        filteredEntries.forEach((entry) => {
            let group = groups.get(entry.collector_id);
            if (!group) {
                group = {
                    collector_id: entry.collector_id,
                    status: "ok",
                };
                groups.set(entry.collector_id, group);
            }

            if (entry.data_type === "rib") {
                group.rib = entry;
            } else {
                group.updates = entry;
            }
        });

        // Second pass: calculate overall status for each collector
        groups.forEach((group) => {
            const ribStatus = group.rib
                ? getCollectorStatus(group.collector_id, group.rib.delay, "rib")
                : null;
            const updatesStatus = group.updates
                ? getCollectorStatus(
                      group.collector_id,
                      group.updates.delay,
                      "updates",
                  )
                : null;

            // Deprecated takes priority, then delayed, then ok
            if (ribStatus === "deprecated" || updatesStatus === "deprecated") {
                group.status = "deprecated";
            } else if (ribStatus === "delayed" || updatesStatus === "delayed") {
                group.status = "delayed";
            } else {
                group.status = "ok";
            }
        });

        // Sort by collector name
        return Array.from(groups.values()).sort((a, b) =>
            sortCollectors(a.collector_id, b.collector_id),
        );
    });

    // Collector modal state
    let modalOpen = $state(false);
    let selectedCollector = $state<string | null>(null);
    let collectorSummary = $derived.by(() => {
        if (!selectedCollector) return null;
        return buildCollectorSummary(
            selectedCollector,
            brokerData.data,
            peersData.data,
            asnData,
        );
    });

    // Country modal state
    let countryModalOpen = $state(false);
    let selectedCountry = $state<string | null>(null);
    let countrySummary = $derived.by(() => {
        if (!selectedCountry) return null;
        return buildCountrySummary(selectedCountry, peersData.data, asnData);
    });

    // Handle initial modal and filters from URL (run once when component first becomes active)
    $effect(() => {
        if (typeof window === "undefined") return;
        if (initializedFromUrl) return; // Only run once ever
        if (!isActive) return; // Wait until we're the active tab

        const url = new URL(window.location.href);

        // Check for collectorModal param
        const collectorModalParam = url.searchParams.get("collectorModal");
        if (collectorModalParam) {
            const exists = entries.some(
                (e) => e.collector_id === collectorModalParam,
            );
            if (exists) {
                selectedCollector = collectorModalParam;
                modalOpen = true;
            }
        }

        // Check for countryModal param
        const countryModalParam = url.searchParams.get("countryModal");
        if (countryModalParam && !collectorModalParam) {
            selectedCountry = countryModalParam;
            countryModalOpen = true;
        }

        // Initialize filters from URL
        const urlSearch = url.searchParams.get("search");
        if (urlSearch) {
            search = urlSearch;
        }

        const urlProject = url.searchParams.get("project") as ProjectFilter;
        if (
            urlProject &&
            ["all", "routeviews", "riperis"].includes(urlProject)
        ) {
            project = urlProject;
        }

        const urlDataType = url.searchParams.get("dataType") as DataTypeFilter;
        if (urlDataType && ["all", "rib", "updates"].includes(urlDataType)) {
            dataType = urlDataType;
        }

        const urlStatus = url.searchParams.get("status") as StatusFilter;
        if (urlStatus && ["all", "ontime", "delayed"].includes(urlStatus)) {
            status = urlStatus;
        }

        const urlShowDeprecated = url.searchParams.get("showDeprecated");
        if (urlShowDeprecated === "true") {
            showDeprecated = true;
        }

        initializedFromUrl = true;
    });

    // Sync filters to URL
    $effect(() => {
        if (typeof window === "undefined") return;
        if (!isActive) return; // Only sync URL when this tab is active
        if (!initializedFromUrl) return; // Wait for URL params to be read first

        const url = new URL(window.location.href);
        let changed = false;

        const setOrDelete = (
            key: string,
            value: string,
            defaultVal: string,
        ) => {
            if (value !== defaultVal) {
                if (url.searchParams.get(key) !== value) {
                    url.searchParams.set(key, value);
                    changed = true;
                }
            } else if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
                changed = true;
            }
        };

        // Always set tab=collectors when on collectors table
        if (url.searchParams.get("tab") !== "collectors") {
            url.searchParams.set("tab", "collectors");
            changed = true;
        }

        setOrDelete("search", search, "");
        setOrDelete("project", project, "all");
        setOrDelete("dataType", dataType, "all");
        setOrDelete("status", status, "all");
        setOrDelete("showDeprecated", showDeprecated ? "true" : "", "");

        // Sync collectorModal param based on modal state (mutually exclusive with other modals)
        if (selectedCollector && modalOpen) {
            // Clear other modal params
            if (url.searchParams.has("countryModal")) {
                url.searchParams.delete("countryModal");
                changed = true;
            }
            if (url.searchParams.has("asnModal")) {
                url.searchParams.delete("asnModal");
                changed = true;
            }
            if (url.searchParams.get("collectorModal") !== selectedCollector) {
                url.searchParams.set("collectorModal", selectedCollector);
                changed = true;
            }
        } else if (url.searchParams.has("collectorModal") && !modalOpen) {
            url.searchParams.delete("collectorModal");
            changed = true;
        }

        // Also sync country modal if open
        if (selectedCountry && countryModalOpen) {
            // Clear other modal params
            if (url.searchParams.has("collectorModal")) {
                url.searchParams.delete("collectorModal");
                changed = true;
            }
            if (url.searchParams.has("asnModal")) {
                url.searchParams.delete("asnModal");
                changed = true;
            }
            if (url.searchParams.get("countryModal") !== selectedCountry) {
                url.searchParams.set("countryModal", selectedCountry);
                changed = true;
            }
        } else if (url.searchParams.has("countryModal") && !countryModalOpen) {
            url.searchParams.delete("countryModal");
            changed = true;
        }

        if (changed) {
            window.history.replaceState({}, "", url.toString());
        }
    });

    function openCollectorModal(collectorId: string) {
        selectedCollector = collectorId;
        modalOpen = true;
        // URL will be updated by the sync effect
    }

    function closeModal() {
        modalOpen = false;
        selectedCollector = null;
        // URL will be updated by the sync effect
    }

    function handleNavigateToPeers(collector: string) {
        closeModal();
        onNavigateToPeers?.(collector);
    }

    // Country modal handlers
    function openCountryModal(countryCode: string) {
        selectedCountry = countryCode;
        countryModalOpen = true;
    }

    function closeCountryModal() {
        countryModalOpen = false;
        selectedCountry = null;
    }

    function handleOpenCountryFromCollector(countryCode: string) {
        closeModal();
        openCountryModal(countryCode);
    }

    function handleNavigateToPeersFromCountry(country: string) {
        closeCountryModal();
        onNavigateToCountry?.(country);
    }

    function handleOpenCollectorFromCountry(collector: string) {
        closeCountryModal();
        openCollectorModal(collector);
    }

    function getStatusIcon(status: "ok" | "delayed" | "deprecated"): string {
        switch (status) {
            case "ok":
                return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="green" class="w-5 h-5"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg>`;
            case "delayed":
                return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="red" class="w-5 h-5"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /> </svg>`;
            case "deprecated":
                return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="gray" class="w-5 h-5"> <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /> </svg>`;
        }
    }

    function getRowCount(group: CollectorGroup): number {
        let count = 0;
        if (group.rib) count++;
        if (group.updates) count++;
        return count || 1;
    }
</script>

{#if brokerData === undefined}
    <span class="loading loading-dots loading-lg"></span>
{:else}
    <FilterBar
        type="broker"
        bind:search
        bind:project
        bind:dataType
        bind:status
        bind:showDeprecated
        totalCount={entries.length}
        filteredCount={filteredEntries.length}
    />

    <div class="overflow-auto max-h-[70vh]">
        <table
            class="table table-bordered border-collapse border border-base-300"
        >
            <thead class="sticky top-0 z-10">
                <tr class="border-b-2 border-base-300">
                    <th class="bg-base-200 border border-base-300 w-36"
                        >Collector ID</th
                    >
                    <th class="bg-base-200 border border-base-300">Type</th>
                    <th class="bg-base-200 border border-base-300">Status</th>
                    <th class="bg-base-200 border border-base-300"
                        >File Time UTC</th
                    >
                    <th class="bg-base-200 border border-base-300"
                        >Last Updated At</th
                    >
                    <th class="bg-base-200 border border-base-300">Size</th>
                    <th class="bg-base-200 border border-base-300">Latest</th>
                </tr>
            </thead>
            <tbody>
                {#each groupedEntries as group}
                    {@const rowCount = getRowCount(group)}
                    {@const dataEntries = [group.rib, group.updates].filter(
                        Boolean,
                    ) as BrokerDataEntry[]}
                    {#each dataEntries as entry, idx}
                        <tr class="hover:bg-base-200">
                            {#if idx === 0}
                                <th
                                    class="bg-base-100 align-middle border border-base-300 w-36"
                                    rowspan={rowCount}
                                >
                                    <button
                                        class="font-mono text-sm link link-hover flex items-center gap-1"
                                        onclick={() =>
                                            openCollectorModal(
                                                group.collector_id,
                                            )}
                                        title="Click to view collector details"
                                    >
                                        <span>{group.collector_id}</span>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke-width="1.5"
                                            stroke="currentColor"
                                            class="w-4 h-4 opacity-40"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                                            />
                                        </svg>
                                    </button>
                                </th>
                            {/if}
                            <td class="border border-base-300">
                                <span
                                    class="badge badge-ghost badge-sm text-xs"
                                >
                                    {entry.data_type}
                                </span>
                            </td>
                            <td class="border border-base-300">
                                {@html getStatusIcon(
                                    getCollectorStatus(
                                        entry.collector_id,
                                        entry.delay,
                                        entry.data_type,
                                    ),
                                )}
                            </td>
                            <td class="border border-base-300"
                                >{entry.ts_start.replace("T", " ")}</td
                            >
                            <td class="border border-base-300"
                                >{duration(entry.delay, "seconds").humanize()} ago</td
                            >
                            <td class="border border-base-300"
                                >{filesize(entry.rough_size).human("si")}</td
                            >
                            <td class="border border-base-300">
                                <a
                                    href={entry.url}
                                    target="_blank"
                                    class="link link-primary"
                                >
                                    Download
                                </a>
                            </td>
                        </tr>
                    {/each}
                {/each}
            </tbody>
        </table>
    </div>

    {#if groupedEntries.length === 0}
        <div class="text-center py-8 text-base-content/60">
            No entries match your filters. Try adjusting your search or filter
            criteria.
        </div>
    {/if}

    <CollectorModal
        summary={collectorSummary}
        {asnData}
        isOpen={modalOpen}
        onClose={closeModal}
        onNavigateToPeers={handleNavigateToPeers}
        onOpenCountry={handleOpenCountryFromCollector}
    />

    <CountryModal
        summary={countrySummary}
        isOpen={countryModalOpen}
        onClose={closeCountryModal}
        onNavigateToPeers={handleNavigateToPeersFromCountry}
        onOpenCollector={handleOpenCollectorFromCountry}
    />
{/if}
