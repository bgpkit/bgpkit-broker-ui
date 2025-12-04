<script lang="ts">
    import type {
        ProjectFilter,
        DataTypeFilter,
        StatusFilter,
        IpVersionFilter,
        FullFeedFilter,
        AsnInfo,
    } from "../types";
    import { countryToFlag } from "../common";

    type FilterType = "broker" | "peers";

    let {
        type,
        search = $bindable(""),
        project = $bindable<ProjectFilter>("all"),
        dataType = $bindable<DataTypeFilter>("all"),
        status = $bindable<StatusFilter>("all"),
        showDeprecated = $bindable(false),
        ipVersion = $bindable<IpVersionFilter>("all"),
        fullFeed = $bindable<FullFeedFilter>("all"),
        collectorFilter = $bindable(""),
        countryFilter = $bindable(""),
        collectors = [],
        countries = [],
        asnData = new Map<number, AsnInfo>(),
        totalCount = 0,
        filteredCount = 0,
    }: {
        type: FilterType;
        search?: string;
        project?: ProjectFilter;
        dataType?: DataTypeFilter;
        status?: StatusFilter;
        showDeprecated?: boolean;
        ipVersion?: IpVersionFilter;
        fullFeed?: FullFeedFilter;
        collectorFilter?: string;
        countryFilter?: string;
        collectors?: string[];
        countries?: string[];
        asnData?: Map<number, AsnInfo>;
        totalCount: number;
        filteredCount: number;
    } = $props();

    // Debounced search - local input value that updates the bound search with delay
    let searchInput = $state(search);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Sync initial search value
    $effect(() => {
        if (search !== searchInput && debounceTimer === null) {
            searchInput = search;
        }
    });

    function handleSearchInput(event: Event) {
        const target = event.target as HTMLInputElement;
        searchInput = target.value;

        // Clear existing timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        // Set new debounce timer
        debounceTimer = setTimeout(() => {
            search = searchInput;
            debounceTimer = null;
        }, 200);
    }

    function clearFilters() {
        searchInput = "";
        search = "";
        project = "all";
        if (type === "broker") {
            dataType = "all";
            status = "all";
            showDeprecated = false;
        } else {
            ipVersion = "all";
            fullFeed = "all";
            collectorFilter = "";
            countryFilter = "";
        }
    }

    // Get country name from asnData for display
    function getCountryName(code: string): string {
        // Try to find a country name from any ASN with this country
        for (const info of asnData.values()) {
            if (info.country === code && info.country_name) {
                return info.country_name;
            }
        }
        return code;
    }

    let hasActiveFilters = $derived(
        search !== "" ||
            project !== "all" ||
            (type === "broker" &&
                (dataType !== "all" || status !== "all" || showDeprecated)) ||
            (type === "peers" &&
                (ipVersion !== "all" ||
                    fullFeed !== "all" ||
                    collectorFilter !== "" ||
                    countryFilter !== "")),
    );
</script>

<div class="flex flex-col gap-4 mb-4">
    <!-- Search and result count row -->
    <div class="flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-64">
            <input
                type="text"
                placeholder={type === "broker"
                    ? "Search collector..."
                    : "Search collector, ASN, or IP..."}
                value={searchInput}
                oninput={handleSearchInput}
                class="input input-bordered w-full"
            />
        </div>
        <div class="text-sm text-base-content/70">
            Showing <span class="font-semibold">{filteredCount}</span> of
            <span class="font-semibold">{totalCount}</span>
            {type === "broker" ? "entries" : "peers"}
        </div>
        {#if hasActiveFilters}
            <button class="btn btn-ghost btn-sm" onclick={clearFilters}>
                Clear filters
            </button>
        {/if}
    </div>

    <!-- Filter controls row -->
    <div class="flex flex-wrap items-center gap-3">
        <!-- Project Filter (common to both) -->
        <div class="flex items-center gap-2">
            <span class="text-sm font-medium">Project:</span>
            <div class="join">
                <button
                    class="join-item btn btn-sm {project === 'all'
                        ? 'btn-active'
                        : ''}"
                    onclick={() => (project = "all")}
                >
                    All
                </button>
                <button
                    class="join-item btn btn-sm {project === 'routeviews'
                        ? 'btn-active'
                        : ''}"
                    onclick={() => (project = "routeviews")}
                >
                    RouteViews
                </button>
                <button
                    class="join-item btn btn-sm {project === 'riperis'
                        ? 'btn-active'
                        : ''}"
                    onclick={() => (project = "riperis")}
                >
                    RIPE RIS
                </button>
            </div>
        </div>

        {#if type === "broker"}
            <!-- Data Type Filter -->
            <div class="flex items-center gap-2">
                <span class="text-sm font-medium">Type:</span>
                <div class="join">
                    <button
                        class="join-item btn btn-sm {dataType === 'all'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (dataType = "all")}
                    >
                        All
                    </button>
                    <button
                        class="join-item btn btn-sm {dataType === 'rib'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (dataType = "rib")}
                    >
                        RIB
                    </button>
                    <button
                        class="join-item btn btn-sm {dataType === 'updates'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (dataType = "updates")}
                    >
                        Updates
                    </button>
                </div>
            </div>

            <!-- Status Filter -->
            <div class="flex items-center gap-2">
                <span class="text-sm font-medium">Status:</span>
                <div class="join">
                    <button
                        class="join-item btn btn-sm {status === 'all'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (status = "all")}
                    >
                        All
                    </button>
                    <button
                        class="join-item btn btn-sm {status === 'ontime'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (status = "ontime")}
                    >
                        ✅ On-time
                    </button>
                    <button
                        class="join-item btn btn-sm {status === 'delayed'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (status = "delayed")}
                    >
                        ⚠️ Delayed
                    </button>
                </div>
            </div>

            <!-- Show Deprecated Checkbox -->
            <label class="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    bind:checked={showDeprecated}
                />
                <span class="text-sm">Show deprecated</span>
            </label>
        {:else}
            <!-- Collector Filter (dropdown) -->
            <div class="flex items-center gap-2">
                <span class="text-sm font-medium">Collector:</span>
                <select
                    class="select select-bordered select-sm w-40"
                    bind:value={collectorFilter}
                >
                    <option value="">All collectors</option>
                    {#each collectors as collector}
                        <option value={collector}>{collector}</option>
                    {/each}
                </select>
            </div>

            <!-- Country/Region Filter -->
            {#if countries.length > 0}
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">Country/Region:</span>
                    <select
                        class="select select-bordered select-sm w-48"
                        bind:value={countryFilter}
                    >
                        <option value="">All countries/regions</option>
                        {#each countries as country}
                            <option value={country}>
                                {countryToFlag(country)}
                                {country} - {getCountryName(country)}
                            </option>
                        {/each}
                    </select>
                </div>
            {/if}

            <!-- IP Version Filter -->
            <div class="flex items-center gap-2">
                <span class="text-sm font-medium">IP:</span>
                <div class="join">
                    <button
                        class="join-item btn btn-sm {ipVersion === 'all'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (ipVersion = "all")}
                    >
                        All
                    </button>
                    <button
                        class="join-item btn btn-sm {ipVersion === 'ipv4'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (ipVersion = "ipv4")}
                    >
                        IPv4
                    </button>
                    <button
                        class="join-item btn btn-sm {ipVersion === 'ipv6'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (ipVersion = "ipv6")}
                    >
                        IPv6
                    </button>
                </div>
            </div>

            <!-- Full-feed Filter -->
            <div class="flex items-center gap-2">
                <span class="text-sm font-medium">Feed:</span>
                <div class="join">
                    <button
                        class="join-item btn btn-sm {fullFeed === 'all'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (fullFeed = "all")}
                    >
                        All
                    </button>
                    <button
                        class="join-item btn btn-sm {fullFeed === 'fullfeed'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (fullFeed = "fullfeed")}
                    >
                        Full-feed
                    </button>
                    <button
                        class="join-item btn btn-sm {fullFeed === 'partial'
                            ? 'btn-active'
                            : ''}"
                        onclick={() => (fullFeed = "partial")}
                    >
                        Partial
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>
