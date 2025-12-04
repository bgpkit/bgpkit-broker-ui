<script lang="ts">
    import type { CountrySummary } from "../types";
    import { countryToFlag, isRipeRis, sortCollectors } from "../common";

    let {
        summary,
        isOpen = false,
        onClose,
        onNavigateToPeers,
        onOpenCollector,
    }: {
        summary: CountrySummary | null;
        isOpen: boolean;
        onClose: () => void;
        onNavigateToPeers?: (country: string) => void;
        onOpenCollector?: (collector: string) => void;
    } = $props();

    let copyButtonText = $state("Share this country/region");

    function copyShareLink() {
        if (!summary) return;
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "peers");
        // Clear other modal params and set countryModal
        url.searchParams.delete("collectorModal");
        url.searchParams.delete("asnModal");
        url.searchParams.set("countryModal", summary.countryCode);
        navigator.clipboard.writeText(url.toString());
        copyButtonText = "Link copied!";
        setTimeout(() => {
            copyButtonText = "Share this country/region";
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
            onNavigateToPeers(summary.countryCode);
        }
    }

    function handleCollectorClick(collector: string) {
        if (onOpenCollector) {
            onOpenCollector(collector);
        }
    }

    function getProjectBadge(collector: string): string {
        return isRipeRis(collector) ? "badge-info" : "badge-primary";
    }

    function getProjectName(collector: string): string {
        return isRipeRis(collector) ? "RIS" : "RV";
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
                        {countryToFlag(summary.countryCode)}
                        {summary.countryName}
                        <span class="badge badge-outline"
                            >{summary.countryCode}</span
                        >
                    </h3>
                </div>
                <button
                    class="btn btn-sm btn-circle btn-ghost"
                    onclick={onClose}
                >
                    ✕
                </button>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-4 mb-6">
                <button
                    class="stat bg-base-200 rounded-lg p-4 text-left hover:bg-base-300 transition-colors cursor-pointer"
                    onclick={handleNavigateToPeers}
                    title="Click to view all peers from this country/region"
                >
                    <div class="stat-title text-sm">Total Peers</div>
                    <div class="stat-value text-2xl">{summary.totalPeers}</div>
                    <div class="stat-desc">
                        <span class="text-xs opacity-60">→ View all</span>
                    </div>
                </button>
                <div class="stat bg-base-200 rounded-lg p-4">
                    <div class="stat-title text-sm">Full-feed Peers</div>
                    <div class="stat-value text-2xl">
                        {summary.fullFeedPeers}
                    </div>
                    <div class="stat-desc">
                        {#if summary.totalPeers > 0}
                            {(
                                (summary.fullFeedPeers / summary.totalPeers) *
                                100
                            ).toFixed(0)}% of total
                        {/if}
                    </div>
                </div>
                <div class="stat bg-base-200 rounded-lg p-4">
                    <div class="stat-title text-sm">Unique ASNs</div>
                    <div class="stat-value text-2xl">{summary.uniqueAsns}</div>
                    <div class="stat-desc">
                        {summary.collectors.length} collector{summary.collectors
                            .length !== 1
                            ? "s"
                            : ""}
                    </div>
                </div>
            </div>

            <!-- Collectors List -->
            <div class="mb-4">
                <h4 class="font-semibold mb-3">
                    Collectors with Peers from {summary.countryName}
                </h4>
                <div class="overflow-x-auto">
                    <table class="table table-zebra table-sm">
                        <thead>
                            <tr>
                                <th>Collector</th>
                                <th>Project</th>
                                <th class="text-right">Peers</th>
                                <th class="text-right">Full-feed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each summary.collectors.toSorted( (a, b) => sortCollectors(a.collector, b.collector), ) as { collector, peerCount, fullFeedCount }}
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
                                    <td class="text-right">{peerCount}</td>
                                    <td class="text-right">
                                        {#if fullFeedCount > 0}
                                            <span class="text-success"
                                                >{fullFeedCount}</span
                                            >
                                        {:else}
                                            <span class="text-base-content/40"
                                                >0</span
                                            >
                                        {/if}
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
                    View all peers from {summary.countryCode}
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
