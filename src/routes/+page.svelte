<script lang="ts">
    import BrokerTable from "$lib/tables/brokerTable.svelte";
    import Header from "$lib/header.svelte";
    import CollectorStats from "$lib/stats/collectorStats.svelte";
    import OnTimeStats from "$lib/stats/onTimeStats.svelte";
    import PeersTable from "$lib/tables/peersTable.svelte";
    import PeersStats from "$lib/stats/peersStats.svelte";
    import CountryStats from "$lib/stats/countryStats.svelte";
    import type { AsnInfo, AsnApiResponse } from "$lib/types";
    import { browser } from "$app/environment";

    /** @type {import('./$types').PageData} */
    let { data } = $props();

    let brokerData = $derived(data.brokerData);
    let peersData = $derived(data.peersData);

    // ASN data state - loaded progressively on client
    let asnData = $state<Map<number, AsnInfo>>(new Map());
    let asnLoading = $state(true);
    let asnLoadProgress = $state({ loaded: 0, total: 0 });

    // Tab state - 0 = Route Collectors, 1 = Collector Peers
    // Start with 0 on server, will be corrected on client mount
    let activeTab = $state(0);
    let tabInitialized = $state(false);

    // Initialize tab state from URL on client mount
    $effect(() => {
        if (!browser || tabInitialized) return;

        const url = new URL(window.location.href);
        const tabParam = url.searchParams.get("tab");
        // Default to peers tab if any peers-specific modal params are present
        if (
            tabParam === "peers" ||
            url.searchParams.has("asnModal") ||
            (url.searchParams.has("countryModal") && tabParam !== "collectors")
        ) {
            activeTab = 1;
        }
        tabInitialized = true;
    });

    // Collector filter for peers tab (set when navigating from collector modal)
    let peersCollectorFilter = $state<string | null>(null);
    let peersCountryFilter = $state<string | null>(null);

    // Initialize filters from URL (only on client)
    $effect(() => {
        if (!browser) return;

        const url = new URL(window.location.href);

        // Only run once on mount - check if we need to set initial filters
        if (activeTab === 1) {
            if (url.searchParams.has("collector") && !peersCollectorFilter) {
                peersCollectorFilter = url.searchParams.get("collector");
            }
            if (url.searchParams.has("country") && !peersCountryFilter) {
                peersCountryFilter = url.searchParams.get("country");
            }
        }
    });

    // Handle navigation from collector modal to peers tab
    function handleNavigateToPeers(collector: string) {
        peersCollectorFilter = collector;
        peersCountryFilter = null;
        activeTab = 1;

        // Update URL to reflect the change
        if (browser) {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", "peers");
            url.searchParams.set("collector", collector);
            url.searchParams.delete("country");
            window.history.replaceState({}, "", url.toString());
        }
    }

    // Handle navigation from country modal to peers tab
    function handleNavigateToCountry(country: string) {
        peersCountryFilter = country;
        peersCollectorFilter = null;
        activeTab = 1;

        // Update URL to reflect the change
        if (browser) {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", "peers");
            url.searchParams.delete("collector");
            url.searchParams.set("country", country);
            window.history.replaceState({}, "", url.toString());
        }
    }

    // Load ASN data using bulk API with comma-separated ASNs
    $effect(() => {
        if (!peersData?.data) return;

        const uniqueAsns = [...new Set(peersData.data.map((p) => p.asn))];
        asnLoadProgress = { loaded: 0, total: uniqueAsns.length };

        // Load ASNs in bulk batches (API supports comma-separated ASNs)
        const batchSize = 50; // Larger batch size since we're using bulk API
        let loadedCount = 0;

        async function loadBatch(startIndex: number) {
            const batch = uniqueAsns.slice(startIndex, startIndex + batchSize);
            if (batch.length === 0) {
                asnLoading = false;
                return;
            }

            try {
                // Use bulk API with comma-separated ASNs
                const asnList = batch.join(",");
                const response = await fetch(
                    `https://api.bgpkit.com/v3/utils/asn?asn=${asnList}`,
                );

                if (response.ok) {
                    const data: AsnApiResponse = await response.json();
                    if (data.data && data.data.length > 0) {
                        const newMap = new Map(asnData);
                        data.data.forEach((info) => {
                            newMap.set(info.asn, info);
                        });
                        asnData = newMap;
                    }
                }
            } catch (error) {
                console.error("Failed to fetch ASN batch:", error);
            }

            loadedCount += batch.length;
            asnLoadProgress = { loaded: loadedCount, total: uniqueAsns.length };

            // Continue loading next batch with a small delay
            if (startIndex + batchSize < uniqueAsns.length) {
                setTimeout(() => loadBatch(startIndex + batchSize), 50);
            } else {
                asnLoading = false;
            }
        }

        loadBatch(0);
    });

    function handleTabChange(tabIndex: number) {
        activeTab = tabIndex;

        // Update URL params when switching tabs
        if (browser) {
            const url = new URL(window.location.href);

            if (tabIndex === 0) {
                // Switching to collectors tab
                url.searchParams.set("tab", "collectors");
                // Remove peers-specific filters
                url.searchParams.delete("country");
                url.searchParams.delete("project");
                url.searchParams.delete("ip");
                url.searchParams.delete("feed");
                url.searchParams.delete("q");
                url.searchParams.delete("collector");
                // Remove peers-specific modal params
                url.searchParams.delete("asnModal");
            } else {
                // Switching to peers tab
                url.searchParams.set("tab", "peers");
                // Clear collector modal param
                peersCollectorFilter = null;
                peersCountryFilter = null;
                url.searchParams.delete("collector");
                // Remove collectors-specific filters
                url.searchParams.delete("search");
                url.searchParams.delete("dataType");
                url.searchParams.delete("status");
                url.searchParams.delete("showDeprecated");
                // Remove collectors-specific modal params
                url.searchParams.delete("collectorModal");
            }

            window.history.replaceState({}, "", url.toString());
        }
    }
</script>

<div class="container mx-auto my-10 px-4">
    {#if brokerData}
        <Header last_updated_ts={brokerData.meta.latest_update_ts} />
    {:else}
        <div class="flex justify-center">
            <span class="loading loading-dots loading-lg"></span>
        </div>
    {/if}

    <div class="flex flex-wrap pt-8 px-auto gap-4 lg:gap-8">
        <CollectorStats {brokerData} />
        <OnTimeStats {brokerData} />
        <PeersStats {peersData} />
        <CountryStats {peersData} {asnData} isLoading={asnLoading} />
    </div>

    <div role="tablist" class="tabs tabs-bordered tabs-lift tabs-lg pt-8">
        <input
            type="radio"
            name="tab"
            role="tab"
            class="tab"
            checked={activeTab === 0}
            aria-label="Route Collectors"
            onchange={() => handleTabChange(0)}
        />
        <div
            role="tabpanel"
            class="tab-content bg-base-100 border-base-300 p-6"
        >
            {#if brokerData && peersData}
                <BrokerTable
                    {brokerData}
                    {peersData}
                    {asnData}
                    isActive={activeTab === 0}
                    onNavigateToPeers={handleNavigateToPeers}
                    onNavigateToCountry={handleNavigateToCountry}
                />
            {:else}
                <div class="flex justify-center py-8">
                    <span class="loading loading-dots loading-lg"></span>
                </div>
            {/if}
        </div>

        <input
            type="radio"
            name="tab"
            role="tab"
            class="tab"
            checked={activeTab === 1}
            aria-label="Collector Peers"
            onchange={() => handleTabChange(1)}
        />
        <div
            role="tabpanel"
            class="tab-content bg-base-100 border-base-300 rounded-box p-6"
        >
            {#if peersData && brokerData}
                <PeersTable
                    {peersData}
                    {brokerData}
                    {asnData}
                    initialCollector={peersCollectorFilter}
                    initialCountry={peersCountryFilter}
                    isActive={activeTab === 1}
                />
            {:else}
                <div class="flex justify-center py-8">
                    <span class="loading loading-dots loading-lg"></span>
                </div>
            {/if}
        </div>
    </div>

    <footer class="mt-8 text-center text-sm text-base-content/60">
        <p>
            Data provided by <a
                href="https://bgpkit.com"
                class="link link-primary">BGPKIT</a
            >
            •
            <a href="https://api.bgpkit.com/docs" class="link" target="_blank"
                >API Documentation</a
            >
        </p>
    </footer>
</div>
