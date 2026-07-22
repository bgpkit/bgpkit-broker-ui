<script lang="ts">
    import BrokerTable from "$lib/tables/brokerTable.svelte";
    import Header from "$lib/header.svelte";
    import CollectorStats from "$lib/stats/collectorStats.svelte";
    import OnTimeStats from "$lib/stats/onTimeStats.svelte";
    import PeersTable from "$lib/tables/peersTable.svelte";
    import PeersStats from "$lib/stats/peersStats.svelte";
    import CountryStats from "$lib/stats/countryStats.svelte";
    import BrokerHealthStats from "$lib/stats/brokerHealthStats.svelte";
    import CollectorSelector from "$lib/components/CollectorSelector.svelte";
    import MrtSearch from "$lib/tables/MrtSearch.svelte";
    import StreamsTable from "$lib/tables/streamsTable.svelte";
    import LiveEvents from "$lib/tables/liveEvents.svelte";
    import type { AsnInfo } from "$lib/types";
    import { browser } from "$app/environment";

    /** @type {import('./$types').PageData} */
    let { data } = $props();

    let brokerData = $derived(data.brokerData);
    let peersData = $derived(data.peersData);
    let collectorsData = $derived(data.collectorsData);
    let healthData = $derived(data.healthData);
    let streamsData = $derived(data.streamsData);

    // ASN data - now loaded server-side with KV caching
    let asnData = $derived(data.asnData);
    let asnLoading = $state(false);
    let asnLoadProgress = $derived({ loaded: asnData.size, total: asnData.size });

    // Tab state - 0 = Route Collectors, 1 = Collector Peers, 2 = Collector Selector, 3 = MRT Search, 4 = Streams, 5 = Live Updates
    // svelte-ignore state_referenced_locally
    let activeTab = $state(data.initialTab);
    let urlTabInitialized = $state(true);

    // Update URL and cleanup when tab changes
    $effect(() => {
        if (!browser || !urlTabInitialized) return;
        
        const url = new URL(window.location.href);
        let newTab = "collectors";
        
        if (activeTab === 1) {
            newTab = "peers";
            url.searchParams.delete("search");
            url.searchParams.delete("dataType");
            url.searchParams.delete("status");
            url.searchParams.delete("showDecommissioned");
            url.searchParams.delete("collectorModal");
            url.searchParams.delete("mrt_ts_start");
            url.searchParams.delete("mrt_ts_end");
            url.searchParams.delete("mrt_project");
            url.searchParams.delete("mrt_collector");
            url.searchParams.delete("mrt_data_type");
        } else if (activeTab === 2) {
            newTab = "selector";
            peersCollectorFilter = null;
            peersCountryFilter = null;
            url.searchParams.delete("collector");
            url.searchParams.delete("country");
            url.searchParams.delete("project");
            url.searchParams.delete("ip");
            url.searchParams.delete("feed");
            url.searchParams.delete("q");
            url.searchParams.delete("search");
            url.searchParams.delete("dataType");
            url.searchParams.delete("status");
            url.searchParams.delete("showDecommissioned");
            url.searchParams.delete("asnModal");
            url.searchParams.delete("countryModal");
            url.searchParams.delete("collectorModal");
            url.searchParams.delete("mrt_ts_start");
            url.searchParams.delete("mrt_ts_end");
            url.searchParams.delete("mrt_project");
            url.searchParams.delete("mrt_collector");
            url.searchParams.delete("mrt_data_type");
        } else if (activeTab === 3) {
            newTab = "search";
            peersCollectorFilter = null;
            peersCountryFilter = null;
            url.searchParams.delete("collector");
            url.searchParams.delete("country");
            url.searchParams.delete("project");
            url.searchParams.delete("ip");
            url.searchParams.delete("feed");
            url.searchParams.delete("q");
            url.searchParams.delete("search");
            url.searchParams.delete("dataType");
            url.searchParams.delete("status");
            url.searchParams.delete("showDecommissioned");
            url.searchParams.delete("asnModal");
            url.searchParams.delete("countryModal");
            url.searchParams.delete("collectorModal");
        } else if (activeTab === 4) {
            newTab = "streams";
            peersCollectorFilter = null;
            peersCountryFilter = null;
            url.searchParams.delete("collector");
            url.searchParams.delete("country");
            url.searchParams.delete("project");
            url.searchParams.delete("ip");
            url.searchParams.delete("feed");
            url.searchParams.delete("q");
            url.searchParams.delete("search");
            url.searchParams.delete("dataType");
            url.searchParams.delete("status");
            url.searchParams.delete("showDecommissioned");
            url.searchParams.delete("asnModal");
            url.searchParams.delete("countryModal");
            url.searchParams.delete("collectorModal");
            url.searchParams.delete("mrt_ts_start");
            url.searchParams.delete("mrt_ts_end");
            url.searchParams.delete("mrt_project");
            url.searchParams.delete("mrt_collector");
            url.searchParams.delete("mrt_data_type");
        } else if (activeTab === 5) {
            newTab = "live";
            peersCollectorFilter = null;
            peersCountryFilter = null;
            url.searchParams.delete("collector");
            url.searchParams.delete("country");
            url.searchParams.delete("project");
            url.searchParams.delete("ip");
            url.searchParams.delete("feed");
            url.searchParams.delete("q");
            url.searchParams.delete("search");
            url.searchParams.delete("dataType");
            url.searchParams.delete("status");
            url.searchParams.delete("showDecommissioned");
            url.searchParams.delete("asnModal");
            url.searchParams.delete("countryModal");
            url.searchParams.delete("collectorModal");
            url.searchParams.delete("mrt_ts_start");
            url.searchParams.delete("mrt_ts_end");
            url.searchParams.delete("mrt_project");
            url.searchParams.delete("mrt_collector");
            url.searchParams.delete("mrt_data_type");
        } else {
            // Switching to collectors tab
            peersCollectorFilter = null;
            peersCountryFilter = null;
            url.searchParams.delete("country");
            url.searchParams.delete("project");
            url.searchParams.delete("ip");
            url.searchParams.delete("feed");
            url.searchParams.delete("q");
            url.searchParams.delete("collector");
            url.searchParams.delete("asnModal");
            url.searchParams.delete("mrt_ts_start");
            url.searchParams.delete("mrt_ts_end");
            url.searchParams.delete("mrt_project");
            url.searchParams.delete("mrt_collector");
            url.searchParams.delete("mrt_data_type");
        }
        
        url.searchParams.set("tab", newTab);
        window.history.replaceState({}, "", url.toString());
    });

    // Collector filter for peers tab (set when navigating from collector modal)
    let peersCollectorFilter = $state<string | null>(null);
    let peersCountryFilter = $state<string | null>(null);

    // Initialize filters from URL (only on client)
    $effect(() => {
        if (!browser || !urlTabInitialized) return;

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

    // ASN data is now loaded server-side with KV caching
    // See +page.server.ts for the fetchAsnInfoBatch call

</script>

<Header last_updated_ts={brokerData?.meta?.latest_update_ts} />

<div class="container mx-auto px-4 py-6">
    {#if !brokerData}
        <div class="flex justify-center py-8">
            <span class="loading loading-dots loading-lg"></span>
        </div>
    {/if}

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CollectorStats {brokerData} />
        <OnTimeStats {brokerData} />
        <PeersStats {peersData} />
        <CountryStats {peersData} {asnData} isLoading={asnLoading} />
        <BrokerHealthStats {healthData} />
    </div>

    <div role="tablist" class="tabs tabs-border mt-8">
        <input
            type="radio"
            name="tab"
            role="tab"
            class="tab text-sm"
            bind:group={activeTab}
            value={0}
            aria-label="Route Collectors"
        />
        <div
            role="tabpanel"
            class="tab-content pt-4"
        >
            {#if brokerData && peersData}
                <BrokerTable
                    {brokerData}
                    {peersData}
                    {asnData}
                    {collectorsData}
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
            class="tab text-sm"
            bind:group={activeTab}
            value={1}
            aria-label="Collector Peers"
        />
        <div
            role="tabpanel"
            class="tab-content pt-4"
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

        <input
            type="radio"
            name="tab"
            role="tab"
            class="tab text-sm"
            bind:group={activeTab}
            value={2}
            aria-label="Collector Selector"
        />
        <div
            role="tabpanel"
            class="tab-content pt-4"
        >
            {#if peersData && asnData.size > 0 && brokerData}
                <CollectorSelector
                    {peersData}
                    {brokerData}
                    {asnData}
                    isActive={activeTab === 2}
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
            class="tab text-sm"
            bind:group={activeTab}
            value={3}
            aria-label="MRT Search"
        />
        <div
            role="tabpanel"
            class="tab-content pt-4"
        >
            {#if collectorsData}
                <MrtSearch
                    {collectorsData}
                    isActive={activeTab === 3}
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
            class="tab text-sm"
            bind:group={activeTab}
            value={4}
            aria-label="Kafka Streams"
        />
        <div
            role="tabpanel"
            class="tab-content pt-4"
        >
            <StreamsTable {streamsData} />
        </div>

        <input
            type="radio"
            name="tab"
            role="tab"
            class="tab text-sm"
            bind:group={activeTab}
            value={5}
            aria-label="Live Updates"
        />
        <div
            role="tabpanel"
            class="tab-content pt-4"
        >
            <LiveEvents collectorsData={collectorsData ?? []} />
        </div>
    </div>

    <footer class="mt-10 border-t border-base-300 pt-4 text-center text-sm text-base-content/60">
        <p>
            Data provided by
            <a href="https://bgpkit.com" class="link link-hover">BGPKIT</a>
            ·
            <a href="https://api.bgpkit.com/docs" class="link link-hover" target="_blank">API Documentation</a>
            ·
            <a href="https://github.com/bgpkit/bgpkit-broker-ui" class="link link-hover" target="_blank">Source on GitHub</a>
        </p>
    </footer>
</div>
