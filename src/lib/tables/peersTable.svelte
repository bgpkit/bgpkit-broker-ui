<script lang="ts">
    import type {
        PeersData,
        PeersDataEntry,
        AsnInfo,
        BrokerData,
        ProjectFilter,
        IpVersionFilter,
        FullFeedFilter,
        CollectorSummary,
        CountrySummary,
    } from "../types";
    import {
        filterPeersData,
        sortPeersData,
        getUniqueCollectors,
        getUniqueCountries,
        isFullFeed,
        countryToFlag,
        buildCollectorSummary,
        buildCountrySummary,
        type SortDirection,
    } from "../common";
    import FilterBar from "../components/FilterBar.svelte";
    import AsnTooltip from "../components/AsnTooltip.svelte";
    import CollectorModal from "../components/CollectorModal.svelte";
    import CountryModal from "../components/CountryModal.svelte";
    import AsnModal from "../components/AsnModal.svelte";

    let {
        peersData,
        brokerData,
        asnData,
        initialCollector = null,
        initialCountry = null,
        isActive = true,
    }: {
        peersData: PeersData;
        brokerData: BrokerData;
        asnData: Map<number, AsnInfo>;
        initialCollector?: string | null;
        initialCountry?: string | null;
        isActive?: boolean;
    } = $props();

    // Filter state
    let search = $state("");
    let project = $state<ProjectFilter>("all");
    let ipVersion = $state<IpVersionFilter>("all");
    let fullFeed = $state<FullFeedFilter>("all");
    let collectorFilter = $state(initialCollector || "");
    let countryFilter = $state(initialCountry || "");

    // Sort state
    let sortBy = $state<keyof PeersDataEntry | "fullFeed">("collector");
    let sortDirection = $state<SortDirection>("asc");

    // Track if initial URL params have been processed
    let initializedFromUrl = $state(false);

    // Collector modal state
    let collectorModalOpen = $state(false);
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

    // ASN modal state
    let asnModalOpen = $state(false);
    let selectedAsn = $state<number | null>(null);
    let selectedAsnInfo = $derived.by(() => {
        if (!selectedAsn) return null;
        return asnData.get(selectedAsn) || null;
    });

    // Get unique collectors and countries for dropdowns
    let collectors = $derived(getUniqueCollectors(peersData.data));
    let countries = $derived(getUniqueCountries(peersData.data, asnData));

    // Filtered and sorted entries
    let filteredEntries = $derived(
        filterPeersData(
            peersData.data,
            search,
            project,
            ipVersion,
            fullFeed,
            collectorFilter,
            countryFilter,
            asnData,
        ),
    );

    let sortedEntries = $derived(
        sortPeersData(filteredEntries, sortBy, sortDirection),
    );

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

        // Always set tab=peers when on peers table
        if (url.searchParams.get("tab") !== "peers") {
            url.searchParams.set("tab", "peers");
            changed = true;
        }

        setOrDelete("collector", collectorFilter, "");
        setOrDelete("country", countryFilter, "");
        setOrDelete("project", project, "all");
        setOrDelete("ip", ipVersion, "all");
        setOrDelete("feed", fullFeed, "all");
        setOrDelete("q", search, "");

        // Sync modal params (mutually exclusive - only one modal can be open at a time)
        if (selectedCollector && collectorModalOpen) {
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
        } else if (
            url.searchParams.has("collectorModal") &&
            !collectorModalOpen
        ) {
            url.searchParams.delete("collectorModal");
            changed = true;
        }

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

        if (selectedAsn && asnModalOpen) {
            // Clear other modal params
            if (url.searchParams.has("collectorModal")) {
                url.searchParams.delete("collectorModal");
                changed = true;
            }
            if (url.searchParams.has("countryModal")) {
                url.searchParams.delete("countryModal");
                changed = true;
            }
            if (url.searchParams.get("asnModal") !== selectedAsn.toString()) {
                url.searchParams.set("asnModal", selectedAsn.toString());
                changed = true;
            }
        } else if (url.searchParams.has("asnModal") && !asnModalOpen) {
            url.searchParams.delete("asnModal");
            changed = true;
        }

        if (changed) {
            window.history.replaceState({}, "", url.toString());
        }
    });

    // Initialize from URL on mount (run once when component first becomes active)
    $effect(() => {
        if (typeof window === "undefined") return;
        if (initializedFromUrl) return; // Only run once ever
        if (!isActive) return; // Wait until we're the active tab

        const url = new URL(window.location.href);

        const urlCollector = url.searchParams.get("collector");
        if (urlCollector && collectors.includes(urlCollector)) {
            collectorFilter = urlCollector;
        }

        const urlCountry = url.searchParams.get("country");
        if (urlCountry && countries.includes(urlCountry)) {
            countryFilter = urlCountry;
        }

        const urlProject = url.searchParams.get("project") as ProjectFilter;
        if (
            urlProject &&
            ["all", "routeviews", "riperis"].includes(urlProject)
        ) {
            project = urlProject;
        }

        const urlIp = url.searchParams.get("ip") as IpVersionFilter;
        if (urlIp && ["all", "ipv4", "ipv6"].includes(urlIp)) {
            ipVersion = urlIp;
        }

        const urlFeed = url.searchParams.get("feed") as FullFeedFilter;
        if (urlFeed && ["all", "fullfeed", "partial"].includes(urlFeed)) {
            fullFeed = urlFeed;
        }

        const urlSearch = url.searchParams.get("q");
        if (urlSearch) {
            search = urlSearch;
        }

        // Open modals from URL (mutually exclusive - only open one)
        const urlCollectorModal = url.searchParams.get("collectorModal");
        const urlCountryModal = url.searchParams.get("countryModal");
        const urlAsnModal = url.searchParams.get("asnModal");

        if (urlCollectorModal) {
            selectedCollector = urlCollectorModal;
            collectorModalOpen = true;
        } else if (urlCountryModal) {
            selectedCountry = urlCountryModal;
            countryModalOpen = true;
        } else if (urlAsnModal) {
            const asnNum = parseInt(urlAsnModal, 10);
            if (!isNaN(asnNum)) {
                selectedAsn = asnNum;
                asnModalOpen = true;
            }
        }

        initializedFromUrl = true;
    });

    // Handle column header click for sorting
    function handleSort(column: keyof PeersDataEntry | "fullFeed") {
        if (sortBy === column) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortBy = column;
            sortDirection = "asc";
        }
    }

    function getSortIndicator(
        column: keyof PeersDataEntry | "fullFeed",
    ): string {
        if (sortBy !== column) return "";
        return sortDirection === "asc" ? " ▲" : " ▼";
    }

    // Get country info for a peer
    function getCountryBadge(
        asn: number,
    ): { flag: string; code: string } | null {
        const info = asnData.get(asn);
        if (info?.country) {
            return {
                flag: countryToFlag(info.country),
                code: info.country,
            };
        }
        return null;
    }

    // Collector modal handlers
    function openCollectorModal(collectorId: string) {
        selectedCollector = collectorId;
        collectorModalOpen = true;
    }

    function closeCollectorModal() {
        collectorModalOpen = false;
        selectedCollector = null;
        // Clear URL param
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.has("collectorModal")) {
                url.searchParams.delete("collectorModal");
                window.history.replaceState({}, "", url.toString());
            }
        }
    }

    function handleNavigateToPeersFromCollector(collector: string) {
        closeCollectorModal();
        collectorFilter = collector;
    }

    // Country modal handlers
    function openCountryModal(countryCode: string) {
        selectedCountry = countryCode;
        countryModalOpen = true;
    }

    function closeCountryModal() {
        countryModalOpen = false;
        selectedCountry = null;
        // Clear URL param
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.has("countryModal")) {
                url.searchParams.delete("countryModal");
                window.history.replaceState({}, "", url.toString());
            }
        }
    }

    function handleNavigateToPeersFromCountry(country: string) {
        closeCountryModal();
        countryFilter = country;
    }

    function handleOpenCollectorFromCountry(collector: string) {
        closeCountryModal();
        openCollectorModal(collector);
    }

    // ASN modal handlers
    function openAsnModal(asn: number) {
        selectedAsn = asn;
        asnModalOpen = true;
    }

    function closeAsnModal() {
        asnModalOpen = false;
        selectedAsn = null;
        // Clear URL param
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.has("asnModal")) {
                url.searchParams.delete("asnModal");
                window.history.replaceState({}, "", url.toString());
            }
        }
    }

    function handleNavigateToPeersFromAsn(asn: number) {
        closeAsnModal();
        search = asn.toString();
    }

    function handleOpenCollectorFromAsn(collector: string) {
        closeAsnModal();
        openCollectorModal(collector);
    }

    function handleOpenCountryFromAsn(countryCode: string) {
        closeAsnModal();
        openCountryModal(countryCode);
    }

    // Virtual scrolling state
    const ROW_HEIGHT = 48; // Approximate row height in pixels
    const BUFFER_ROWS = 10; // Number of rows to render above/below visible area
    let scrollContainer: HTMLElement | null = $state(null);
    let scrollTop = $state(0);
    let containerHeight = $state(0);

    // Calculate visible row range
    let visibleRange = $derived.by(() => {
        const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
        const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + BUFFER_ROWS * 2;
        const endIdx = Math.min(sortedEntries.length, startIdx + visibleCount);
        return { start: startIdx, end: endIdx };
    });

    // Only render rows in visible range
    let visibleEntries = $derived(
        sortedEntries.slice(visibleRange.start, visibleRange.end)
    );

    // Total height for scroll area
    let totalHeight = $derived(sortedEntries.length * ROW_HEIGHT);
    let offsetY = $derived(visibleRange.start * ROW_HEIGHT);

    function handleScroll(event: Event) {
        const target = event.target as HTMLElement;
        scrollTop = target.scrollTop;
    }

    function updateContainerHeight() {
        if (scrollContainer) {
            containerHeight = scrollContainer.clientHeight;
        }
    }

    // Initialize container height on mount
    $effect(() => {
        if (!isActive) return;

        updateContainerHeight();

        window.addEventListener('resize', updateContainerHeight);

        return () => {
            window.removeEventListener('resize', updateContainerHeight);
        };
    });
</script>

{#if peersData === undefined}
    <span class="loading loading-dots loading-lg"></span>
{:else}
    <FilterBar
        type="peers"
        bind:search
        bind:project
        bind:ipVersion
        bind:fullFeed
        bind:collectorFilter
        bind:countryFilter
        {collectors}
        {countries}
        {asnData}
        totalCount={peersData.data.length}
        filteredCount={filteredEntries.length}
    />

    <div
        bind:this={scrollContainer}
        class="overflow-auto max-h-[70vh]"
        onscroll={handleScroll}
    >
        <table
            class="table table-fixed table-bordered border-collapse border border-base-300 w-full"
        >
            <thead class="sticky top-0 z-10">
                <tr class="border-b-2 border-base-300">
                    <th
                        class="cursor-pointer hover:bg-base-300 select-none bg-base-200 border border-base-300 w-36"
                        onclick={() => handleSort("collector")}
                    >
                        Collector{getSortIndicator("collector")}
                    </th>
                    <th
                        class="cursor-pointer hover:bg-base-300 select-none bg-base-200 border border-base-300 w-40"
                        onclick={() => handleSort("ip")}
                    >
                        IP{getSortIndicator("ip")}
                    </th>
                    <th
                        class="cursor-pointer hover:bg-base-300 select-none bg-base-200 border border-base-300 w-48"
                        onclick={() => handleSort("asn")}
                    >
                        ASN{getSortIndicator("asn")}
                    </th>
                    <th class="bg-base-200 border border-base-300 w-32"
                        >Country/Region</th
                    >
                    <th
                        class="cursor-pointer hover:bg-base-300 select-none bg-base-200 border border-base-300 w-32"
                        onclick={() => handleSort("num_v4_pfxs")}
                    >
                        IPv4 Prefixes{getSortIndicator("num_v4_pfxs")}
                    </th>
                    <th
                        class="cursor-pointer hover:bg-base-300 select-none bg-base-200 border border-base-300 w-32"
                        onclick={() => handleSort("num_v6_pfxs")}
                    >
                        IPv6 Prefixes{getSortIndicator("num_v6_pfxs")}
                    </th>
                    <th
                        class="cursor-pointer hover:bg-base-300 select-none bg-base-200 border border-base-300 w-32"
                        onclick={() => handleSort("num_connected_asns")}
                    >
                        Connected ASNs{getSortIndicator("num_connected_asns")}
                    </th>
                    <th
                        class="cursor-pointer hover:bg-base-300 select-none bg-base-200 border border-base-300 w-24"
                        onclick={() => handleSort("fullFeed")}
                    >
                        Full-feed?{getSortIndicator("fullFeed")}
                    </th>
                </tr>
            </thead>
            <tbody>
                <!-- Spacer for virtual scrolling -->
                {#if visibleRange.start > 0}
                    <tr style="height: {offsetY}px;">
                        <td colspan="8" style="padding: 0; border: none;"></td>
                    </tr>
                {/if}
                {#each visibleEntries as { collector, ip, asn, num_v4_pfxs, num_v6_pfxs, num_connected_asns }, i (visibleRange.start + i)}
                    {@const country = getCountryBadge(asn)}
                    {@const peerIsFullFeed = isFullFeed({
                        collector,
                        ip,
                        asn,
                        num_v4_pfxs,
                        num_v6_pfxs,
                        num_connected_asns,
                        date: "",
                    })}
                    <tr class="hover:bg-base-200">
                        <td class="bg-base-100 border border-base-300 w-36 overflow-hidden">
                            <button
                                class="font-mono text-sm link link-hover flex items-center gap-1"
                                onclick={() => openCollectorModal(collector)}
                                title="Click to view collector details"
                            >
                                <span>{collector}</span>
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
                        </td>
                        <td class="border border-base-300 w-40 overflow-hidden">
                            <span class="font-mono text-sm">{ip}</span>
                        </td>
                        <td class="border border-base-300 w-48 overflow-hidden">
                            <div class="flex items-center gap-1">
                                <AsnTooltip
                                    {asn}
                                    asnInfo={asnData.get(asn)}
                                    onClick={openAsnModal}
                                />
                                <span class="text-xs text-base-content/60 truncate">
                                    {asnData.get(asn)?.name || ''}
                                </span>
                            </div>
                        </td>
                        <td class="border border-base-300 w-32 overflow-hidden">
                            {#if country}
                                <button
                                    class="badge badge-sm badge-outline gap-1 cursor-pointer hover:bg-base-200"
                                    title="Click to view all peers from {asnData.get(
                                        asn,
                                    )?.country_name || country.code}"
                                    onclick={() =>
                                        openCountryModal(country.code)}
                                >
                                    {country.flag}
                                    {country.code}
                                </button>
                            {:else}
                                <span class="text-base-content/40">--</span>
                            {/if}
                        </td>
                        <td class="border border-base-300 w-32 overflow-hidden">
                            <span class="flex items-center gap-1">
                                {#if num_v4_pfxs > 0 && num_v4_pfxs > 700_000}
                                    <span title="Full IPv4 table">✅</span>
                                {/if}
                                <span
                                    class={num_v4_pfxs === 0
                                        ? "text-base-content/40"
                                        : ""}
                                >
                                    {num_v4_pfxs.toLocaleString()}
                                </span>
                            </span>
                        </td>
                        <td class="border border-base-300 w-32 overflow-hidden">
                            <span class="flex items-center gap-1">
                                {#if num_v6_pfxs > 0 && num_v6_pfxs > 100_000}
                                    <span title="Full IPv6 table">✅</span>
                                {/if}
                                <span
                                    class={num_v6_pfxs === 0
                                        ? "text-base-content/40"
                                        : ""}
                                >
                                    {num_v6_pfxs.toLocaleString()}
                                </span>
                            </span>
                        </td>
                        <td class="border border-base-300 w-32 overflow-hidden"
                            >{num_connected_asns.toLocaleString()}</td
                        >
                        <td class="border border-base-300 w-24 overflow-hidden">
                            {#if peerIsFullFeed}
                                <span class="badge badge-success badge-sm"
                                    >Yes</span
                                >
                            {:else}
                                <span class="badge badge-ghost badge-sm"
                                    >No</span
                                >
                            {/if}
                        </td>
                    </tr>
                {/each}
                <!-- Spacer for virtual scrolling -->
                {#if visibleRange.end < sortedEntries.length}
                    <tr style="height: {(sortedEntries.length - visibleRange.end) * ROW_HEIGHT}px;">
                        <td colspan="8" style="padding: 0; border: none;"></td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>

    {#if sortedEntries.length === 0}
        <div class="text-center py-8 text-base-content/60">
            No peers match your filters. Try adjusting your search or filter
            criteria.
        </div>
    {/if}

    <CollectorModal
        summary={collectorSummary}
        {asnData}
        isOpen={collectorModalOpen}
        onClose={closeCollectorModal}
        onNavigateToPeers={handleNavigateToPeersFromCollector}
    />

    <CountryModal
        summary={countrySummary}
        isOpen={countryModalOpen}
        onClose={closeCountryModal}
        onNavigateToPeers={handleNavigateToPeersFromCountry}
        onOpenCollector={handleOpenCollectorFromCountry}
    />

    <AsnModal
        asn={selectedAsn}
        asnInfo={selectedAsnInfo}
        peerEntries={peersData.data}
        isOpen={asnModalOpen}
        onClose={closeAsnModal}
        onNavigateToPeers={handleNavigateToPeersFromAsn}
        onOpenCollector={handleOpenCollectorFromAsn}
        onOpenCountry={handleOpenCountryFromAsn}
    />
{/if}
