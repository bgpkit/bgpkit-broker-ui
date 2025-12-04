<script lang="ts">
    import type { AsnInfo, PeersDataEntry } from "../types";
    import {
        countryToFlag,
        isFullFeed,
        sortCollectors,
        isRipeRis,
    } from "../common";

    let {
        asn,
        asnInfo,
        peerEntries,
        isOpen = false,
        onClose,
        onNavigateToPeers,
        onOpenCollector,
        onOpenCountry,
    }: {
        asn: number | null;
        asnInfo: AsnInfo | null | undefined;
        peerEntries: PeersDataEntry[];
        isOpen: boolean;
        onClose: () => void;
        onNavigateToPeers?: (asn: number) => void;
        onOpenCollector?: (collector: string) => void;
        onOpenCountry?: (countryCode: string) => void;
    } = $props();

    let copyButtonText = $state("Share this ASN");

    function copyShareLink() {
        if (!asn) return;
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "peers");
        // Clear other modal params and set asnModal
        url.searchParams.delete("collectorModal");
        url.searchParams.delete("countryModal");
        url.searchParams.set("asnModal", asn.toString());
        navigator.clipboard.writeText(url.toString());
        copyButtonText = "Link copied!";
        setTimeout(() => {
            copyButtonText = "Share this ASN";
        }, 2000);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape" && isOpen) {
            onClose();
        }
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }

    function handleNavigateToPeers() {
        if (asn && onNavigateToPeers) {
            onNavigateToPeers(asn);
        }
    }

    function handleCollectorClick(collector: string) {
        if (onOpenCollector) {
            onOpenCollector(collector);
        }
    }

    function handleCountryClick(countryCode: string) {
        if (onOpenCountry) {
            onOpenCountry(countryCode);
        }
    }

    function getProjectBadge(collector: string): string {
        return isRipeRis(collector) ? "badge-info" : "badge-primary";
    }

    function getProjectName(collector: string): string {
        return isRipeRis(collector) ? "RIS" : "RV";
    }

    // Get all peers for this ASN grouped by collector
    let collectorStats = $derived.by(() => {
        if (!asn) return [];

        const asnPeers = peerEntries.filter((p) => p.asn === asn);
        const stats = new Map<
            string,
            { total: number; fullFeed: number; ips: string[] }
        >();

        asnPeers.forEach((peer) => {
            const existing = stats.get(peer.collector) || {
                total: 0,
                fullFeed: 0,
                ips: [],
            };
            existing.total += 1;
            if (isFullFeed(peer)) {
                existing.fullFeed += 1;
            }
            existing.ips.push(peer.ip);
            stats.set(peer.collector, existing);
        });

        return Array.from(stats.entries())
            .map(([collector, data]) => ({
                collector,
                total: data.total,
                fullFeed: data.fullFeed,
                ips: data.ips,
            }))
            .sort((a, b) => sortCollectors(a.collector, b.collector));
    });

    let totalPeers = $derived(
        collectorStats.reduce((sum, c) => sum + c.total, 0),
    );
    let totalFullFeed = $derived(
        collectorStats.reduce((sum, c) => sum + c.fullFeed, 0),
    );
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && asn}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <dialog class="modal modal-open" onclick={handleBackdropClick}>
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-2xl flex items-center gap-3">
                        AS{asn}
                        {#if asnInfo?.country}
                            <button
                                class="badge badge-outline gap-1 cursor-pointer hover:bg-base-200"
                                onclick={() =>
                                    handleCountryClick(asnInfo.country)}
                                title="Click to view all peers from {asnInfo.country_name ||
                                    asnInfo.country}"
                            >
                                {countryToFlag(asnInfo.country)}
                                {asnInfo.country}
                            </button>
                        {/if}
                    </h3>
                    {#if asnInfo?.name}
                        <p class="text-lg text-base-content/80 mt-1">
                            {asnInfo.name}
                        </p>
                    {/if}
                </div>
                <button
                    class="btn btn-sm btn-circle btn-ghost"
                    onclick={onClose}
                >
                    ✕
                </button>
            </div>

            <!-- ASN Info -->
            {#if asnInfo}
                <div class="bg-base-200 rounded-lg p-4 mb-6">
                    <div class="grid grid-cols-2 gap-4">
                        {#if asnInfo.as2org?.org_name}
                            <div>
                                <span
                                    class="text-xs text-base-content/60 uppercase"
                                    >Organization</span
                                >
                                <p class="font-medium">
                                    {asnInfo.as2org.org_name}
                                </p>
                            </div>
                        {/if}
                        {#if asnInfo.country_name}
                            <div>
                                <span
                                    class="text-xs text-base-content/60 uppercase"
                                    >Country/Region</span
                                >
                                <button
                                    class="font-medium flex items-center gap-1 hover:underline cursor-pointer"
                                    onclick={() =>
                                        handleCountryClick(asnInfo.country)}
                                    title="Click to view all peers from {asnInfo.country_name}"
                                >
                                    {countryToFlag(asnInfo.country)}
                                    {asnInfo.country_name}
                                </button>
                            </div>
                        {/if}
                        {#if asnInfo.peeringdb?.website}
                            <div>
                                <span
                                    class="text-xs text-base-content/60 uppercase"
                                    >Website</span
                                >
                                <p>
                                    <a
                                        href={asnInfo.peeringdb.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="link link-primary text-sm"
                                    >
                                        {asnInfo.peeringdb.website} ↗
                                    </a>
                                </p>
                            </div>
                        {/if}
                        {#if asnInfo.peeringdb?.irr_as_set}
                            <div>
                                <span
                                    class="text-xs text-base-content/60 uppercase"
                                    >IRR AS-SET</span
                                >
                                <p class="font-mono text-sm">
                                    {asnInfo.peeringdb.irr_as_set}
                                </p>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-4 mb-6">
                <button
                    class="stat bg-base-200 rounded-lg p-4 text-left hover:bg-base-300 transition-colors cursor-pointer"
                    onclick={handleNavigateToPeers}
                    title="Click to view all peers for this ASN"
                >
                    <div class="stat-title text-sm">Total Peers</div>
                    <div class="stat-value text-2xl">{totalPeers}</div>
                    <div class="stat-desc">
                        <span class="text-xs opacity-60">→ View all</span>
                    </div>
                </button>
                <div class="stat bg-base-200 rounded-lg p-4">
                    <div class="stat-title text-sm">Full-feed Peers</div>
                    <div class="stat-value text-2xl">{totalFullFeed}</div>
                    <div class="stat-desc">
                        {#if totalPeers > 0}
                            {((totalFullFeed / totalPeers) * 100).toFixed(0)}%
                            of total
                        {/if}
                    </div>
                </div>
                <div class="stat bg-base-200 rounded-lg p-4">
                    <div class="stat-title text-sm">Collectors</div>
                    <div class="stat-value text-2xl">
                        {collectorStats.length}
                    </div>
                    <div class="stat-desc">
                        {collectorStats.filter((c) => isRipeRis(c.collector))
                            .length} RIS,
                        {collectorStats.filter((c) => !isRipeRis(c.collector))
                            .length} RV
                    </div>
                </div>
            </div>

            <!-- Collectors List -->
            <div class="mb-4">
                <h4 class="font-semibold mb-3">
                    Collectors with AS{asn} Peers
                </h4>
                <div class="overflow-x-auto">
                    <table class="table table-zebra table-sm">
                        <thead>
                            <tr>
                                <th>Collector</th>
                                <th>Project</th>
                                <th class="text-right">Peers</th>
                                <th class="text-right">Full-feed</th>
                                <th>IPs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each collectorStats as { collector, total, fullFeed, ips }}
                                <tr class="hover">
                                    <td>
                                        <button
                                            class="link link-hover font-mono text-sm"
                                            onclick={() =>
                                                handleCollectorClick(collector)}
                                        >
                                            {collector}
                                        </button>
                                    </td>
                                    <td>
                                        <span
                                            class="badge badge-outline badge-sm {getProjectBadge(
                                                collector,
                                            )}"
                                        >
                                            {getProjectName(collector)}
                                        </span>
                                    </td>
                                    <td class="text-right">{total}</td>
                                    <td class="text-right">
                                        {#if fullFeed > 0}
                                            <span class="text-success"
                                                >{fullFeed}</span
                                            >
                                        {:else}
                                            <span class="text-base-content/40"
                                                >0</span
                                            >
                                        {/if}
                                    </td>
                                    <td>
                                        <div
                                            class="flex flex-wrap gap-1 max-w-48"
                                        >
                                            {#each ips.slice(0, 3) as ip}
                                                <span
                                                    class="badge badge-ghost badge-xs font-mono"
                                                    >{ip}</span
                                                >
                                            {/each}
                                            {#if ips.length > 3}
                                                <span
                                                    class="badge badge-ghost badge-xs"
                                                    >+{ips.length - 3}</span
                                                >
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Actions -->
            <div class="modal-action">
                <button
                    class="btn btn-ghost btn-sm"
                    onclick={handleNavigateToPeers}
                >
                    View all peers for AS{asn}
                </button>
                <button class="btn btn-ghost btn-sm" onclick={copyShareLink}>
                    {copyButtonText}
                </button>
                <button class="btn btn-ghost btn-sm" onclick={onClose}>
                    Close
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button onclick={onClose}>close</button>
        </form>
    </dialog>
{/if}
