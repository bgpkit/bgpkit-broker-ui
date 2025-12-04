<script lang="ts">
    import filesize from "file-size";
    import pkg from "moment/moment";
    const { duration } = pkg;
    import type { CollectorSummary, AsnInfo } from "../types";
    import { countryToFlag, extractCollectorUrl } from "../common";

    let {
        summary,
        asnData,
        isOpen = false,
        onClose,
        onNavigateToPeers,
        onOpenCountry,
    }: {
        summary: CollectorSummary | null;
        asnData: Map<number, AsnInfo>;
        isOpen: boolean;
        onClose: () => void;
        onNavigateToPeers?: (collector: string) => void;
        onOpenCountry?: (countryCode: string) => void;
    } = $props();

    let copyButtonText = $state("Share this collector");

    function handleCountryClick(countryCode: string) {
        if (onOpenCountry) {
            onOpenCountry(countryCode);
        }
    }

    function getStatusBadge(status: "ok" | "delayed" | "deprecated") {
        switch (status) {
            case "ok":
                return "badge-success";
            case "delayed":
                return "badge-warning";
            case "deprecated":
                return "badge-neutral";
        }
    }

    function getStatusText(status: "ok" | "delayed" | "deprecated") {
        switch (status) {
            case "ok":
                return "On-time";
            case "delayed":
                return "Delayed";
            case "deprecated":
                return "Deprecated";
        }
    }

    function copyShareLink() {
        if (!summary) return;
        const url = new URL(window.location.href);
        // Clear other modal params and set collectorModal
        url.searchParams.delete("countryModal");
        url.searchParams.delete("asnModal");
        url.searchParams.set("collectorModal", summary.collector_id);
        navigator.clipboard.writeText(url.toString());
        copyButtonText = "Link copied!";
        setTimeout(() => {
            copyButtonText = "Share this collector";
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
        if (summary && onNavigateToPeers) {
            onNavigateToPeers(summary.collector_id);
        }
    }

    // Get all countries with counts (sorted by count descending)
    function getAllCountries(
        uniqueAsns: number[],
        asnData: Map<number, AsnInfo>,
    ): { country: string; countryName: string; count: number }[] {
        const countryCounts = new Map<
            string,
            { name: string; count: number }
        >();
        uniqueAsns.forEach((asn) => {
            const info = asnData.get(asn);
            if (info?.country) {
                const existing = countryCounts.get(info.country);
                if (existing) {
                    existing.count += 1;
                } else {
                    countryCounts.set(info.country, {
                        name: info.country_name || info.country,
                        count: 1,
                    });
                }
            }
        });
        return Array.from(countryCounts.entries())
            .map(([country, data]) => ({
                country,
                countryName: data.name,
                count: data.count,
            }))
            .sort((a, b) => b.count - a.count);
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && summary}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <dialog class="modal modal-open" onclick={handleBackdropClick}>
        <div class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-2xl flex items-center gap-3">
                        {summary.collector_id}
                        <span class="badge {getStatusBadge(summary.status)}">
                            {getStatusText(summary.status)}
                        </span>
                    </h3>
                    <p class="text-base-content/70 mt-1">
                        <span
                            class="badge badge-outline {summary.project ===
                            'RIPE RIS'
                                ? 'badge-info'
                                : 'badge-primary'}"
                        >
                            {summary.project}
                        </span>
                    </p>
                </div>
                <button
                    class="btn btn-sm btn-circle btn-ghost"
                    onclick={onClose}
                >
                    ✕
                </button>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-4 mb-6">
                <button
                    class="stat bg-base-200 rounded-lg p-4 text-left hover:bg-base-300 transition-colors cursor-pointer"
                    onclick={handleNavigateToPeers}
                    title="Click to view peers for this collector"
                >
                    <div class="stat-title text-sm">Total Peers</div>
                    <div class="stat-value text-2xl">{summary.peerCount}</div>
                    <div class="stat-desc">
                        {summary.fullFeedPeerCount} full-feed
                        <span class="text-xs opacity-60 ml-1">→ View all</span>
                    </div>
                </button>
                <div class="stat bg-base-200 rounded-lg p-4">
                    <div class="stat-title text-sm">Countries/Regions</div>
                    <div class="stat-value text-2xl">
                        {summary.uniqueCountries.length}
                    </div>
                    <div class="stat-desc">
                        {summary.uniqueAsns.length} unique ASNs
                    </div>
                </div>
            </div>

            <!-- All Countries -->
            {#if summary.uniqueCountries.length > 0}
                {@const allCountries = getAllCountries(
                    summary.uniqueAsns,
                    asnData,
                )}
                <div class="mb-6">
                    <h4 class="font-semibold mb-2">
                        Collector Peer ASN Countries/Regions
                    </h4>
                    <div
                        class="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1"
                    >
                        {#each allCountries as { country, countryName, count }}
                            <button
                                class="badge badge-lg gap-1 cursor-pointer hover:bg-base-300 transition-colors"
                                title="{countryName}: {count} ASN{count !== 1
                                    ? 's'
                                    : ''} - Click to view details"
                                onclick={() => handleCountryClick(country)}
                            >
                                {countryToFlag(country)}
                                {country}
                                <span class="badge badge-sm badge-ghost"
                                    >{count}</span
                                >
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Latest Files -->
            <div class="space-y-4">
                {#if summary.latestRib}
                    <div class="bg-base-200 rounded-lg p-4">
                        <div class="flex justify-between items-center">
                            <div>
                                <h4 class="font-semibold">Latest RIB</h4>
                                <p class="text-sm text-base-content/70">
                                    {summary.latestRib.ts_start.replace(
                                        "T",
                                        " ",
                                    )} UTC
                                </p>
                                <p class="text-sm text-base-content/70">
                                    {duration(
                                        summary.latestRib.delay,
                                        "seconds",
                                    ).humanize()} ago •
                                    {filesize(
                                        summary.latestRib.rough_size,
                                    ).human("si")}
                                </p>
                            </div>
                            <a
                                href={summary.latestRib.url}
                                target="_blank"
                                class="btn btn-primary btn-sm"
                            >
                                Download
                            </a>
                        </div>
                    </div>
                {/if}

                {#if summary.latestUpdates}
                    <div class="bg-base-200 rounded-lg p-4">
                        <div class="flex justify-between items-center">
                            <div>
                                <h4 class="font-semibold">Latest Updates</h4>
                                <p class="text-sm text-base-content/70">
                                    {summary.latestUpdates.ts_start.replace(
                                        "T",
                                        " ",
                                    )} UTC
                                </p>
                                <p class="text-sm text-base-content/70">
                                    {duration(
                                        summary.latestUpdates.delay,
                                        "seconds",
                                    ).humanize()} ago • {filesize(
                                        summary.latestUpdates.rough_size,
                                    ).human("si")}
                                </p>
                            </div>
                            <a
                                href={summary.latestUpdates.url}
                                target="_blank"
                                class="btn btn-primary btn-sm"
                            >
                                Download
                            </a>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            <div class="modal-action">
                {#if summary.latestRib}
                    <a
                        href={extractCollectorUrl(summary.latestRib.url)}
                        target="_blank"
                        class="btn btn-ghost btn-sm"
                    >
                        Browse Files
                    </a>
                {/if}
                <button class="btn btn-ghost btn-sm" onclick={copyShareLink}>
                    {copyButtonText}
                </button>
                <button class="btn btn-ghost btn-sm" onclick={onClose}
                    >Close</button
                >
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button onclick={onClose}>close</button>
        </form>
    </dialog>
{/if}
