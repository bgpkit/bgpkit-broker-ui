<script lang="ts">
    import pkg from "moment/moment";
    import type { PeersData, PeersDataEntry } from "../types";

    const { peersData, showOnlyFullFeed = false }: { peersData: PeersData, showOnlyFullFeed?: boolean } = $props();

    let entries: PeersDataEntry[] = $state([]);

    $effect(() => {
        // This will re-run whenever showOnlyFullFeed or peersData changes
        if (!peersData?.data) return;

        if (showOnlyFullFeed) {
            entries = peersData.data.filter(
              entry => entry.num_v4_pfxs > 700_000 || entry.num_v6_pfxs > 100_000
            );
        } else {
            entries = peersData.data;
        }
    });
</script>

{#if peersData === undefined}
    <span class="loading loading-dots loading-lg"></span>
{:else}
    <div class="overflow-x-auto">
        <table class="table table-zebra">
            <!-- head -->
            <thead>
                <tr>
                    <th>Collector ID</th>
                    <th>IP</th>
                    <th>ASN</th>
                    <th>IPv4 Prefixes</th>
                    <th>IPv6 Prefixes</th>
                    <th>Connected ASNs</th>
                    <th>Full-feed?</th>
                </tr>
            </thead>
            <tbody>
                {#each entries as { collector, ip, asn, num_v4_pfxs, num_v6_pfxs, num_connected_asns }}
                    <tr>
                        <td>
                            {collector}
                        </td>
                        <td>{ip}</td>
                        <td>
                            {asn}
                        </td>
                        <td>
                            {#if num_v4_pfxs > 0}
                                {num_v4_pfxs > 700_000 ? "✅" : " "}
                            {/if}
                            {num_v4_pfxs}
                        </td>
                        <td>
                            {#if num_v6_pfxs > 0}
                                {num_v6_pfxs > 100_000 ? "✅" : " "}
                            {/if}
                            {num_v6_pfxs}
                        </td>
                        <td>{num_connected_asns}</td>
                        <td>
                            {num_v4_pfxs > 700_000 || num_v6_pfxs > 100_000
                                ? "✅"
                                : "❌"}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}
