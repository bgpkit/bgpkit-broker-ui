<script lang="ts">
     import type { PeersData, AsnInfo, BrokerData } from "../types";
     import {
          calculateGreedyCoverage,
          calculateCoverageCurve,
          countryToFlag,
          isRipeRis,
          isFullFeed,
     } from "../common";
     import CoverageChart from "./CoverageChart.svelte";

     let {
          peersData,
          brokerData,
          asnData,
          isActive = true,
     }: {
          peersData: PeersData;
          brokerData: BrokerData;
          asnData: Map<number, AsnInfo>;
          isActive?: boolean;
     } = $props();

     // Selection state
     let goal = $state<"asns" | "countries">("asns");
     let ipFamily = $state<"all" | "ipv4" | "ipv6">("all");
     let project = $state<"any" | "rv" | "ris" | "balanced">("any");
     let maxCollectors = $state(10);
     let sliderValue = $state(10);

     // Update slider when available collectors count changes
     $effect(() => {
          if (sliderValue > availableCollectorsCount) {
               sliderValue = availableCollectorsCount;
          }
          if (sliderValue < 1) {
               sliderValue = 1;
          }
     });

     function handleSliderChange() {
          maxCollectors = sliderValue;
     }

     // Calculate coverage when inputs change

     // Helper: Get file size for a collector from broker data (updates only, no RIB)
     function getCollectorFileSize(collectorId: string): {
          updatesSize: number;
     } {
          if (!brokerData?.data) return { updatesSize: 0 };

          // Get all entries for this collector
          const entries = brokerData.data.filter(
               (e) => e.collector_id === collectorId,
          );

          if (entries.length === 0) return { updatesSize: 0 };

          // Sum up updates file sizes
          let updatesSize = 0;
          for (const entry of entries) {
               if (entry.data_type === "updates") {
                    updatesSize += entry.rough_size;
               }
          }

          return { updatesSize };
     }

     // Helper: Get file sizes for multiple collectors (updates only, no RIB)
     function getCollectorsFileSizes(collectors: string[]): {
          updatesSize: number;
          risUpdatesSize: number;
          rvUpdatesSize: number;
     } {
          let updatesSize = 0;
          let risUpdatesSize = 0;
          let rvUpdatesSize = 0;

          for (const collector of collectors) {
               const sizes = getCollectorFileSize(collector);
               const isRis = isRipeRis(collector);

               if (sizes.updatesSize > 0) {
                    updatesSize += sizes.updatesSize;
                    if (isRis) risUpdatesSize += sizes.updatesSize;
                    else rvUpdatesSize += sizes.updatesSize;
               }
          }

          return {
               updatesSize,
               risUpdatesSize,
               rvUpdatesSize,
          };
     }

     // Calculate file sizes for selected collectors (updates only, no RIB)
     let fileSizes = $derived.by(() => {
          if (!result?.selectedCollectors) {
               return { updatesSize: 0, totalPerRound: 0, totalPerHour: 0 };
          }

          const sizes = getCollectorsFileSizes(result.selectedCollectors);
          const totalPerRound = sizes.updatesSize;

          // RIS: 5-min intervals = 12/hour, RV: 15-min intervals = 4/hour
          const risPerHour = sizes.risUpdatesSize * 12;
          const rvPerHour = sizes.rvUpdatesSize * 4;
          const totalPerHour = risPerHour + rvPerHour;

          return {
               updatesSize: sizes.updatesSize,
               risUpdatesSize: sizes.risUpdatesSize,
               rvUpdatesSize: sizes.rvUpdatesSize,
               totalPerRound,
               risPerHour,
               rvPerHour,
               totalPerHour,
          };
     });

     // Calculate selected full-feed peers count
     let selectedFullFeedPeers = $derived.by(() => {
          if (!result) return 0;

          const peers = new Set<number>();
          for (const step of result.coverageByStep) {
               const details = result.collectorDetails.get(step.collector);
               if (details) {
                    for (const peer of details.fullFeedPeers) {
                         peers.add(peer.asn);
                    }
               }
          }
          return peers.size;
     });

     // Helper: Format bytes to human-readable format
     function formatBytes(bytes: number): string {
          if (bytes === 0) return "0 B";
          const k = 1024;
          const sizes = ["B", "KB", "MB", "GB", "TB"];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return (
               parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
          );
     }

     // Calculate available collectors count based on current filters (same logic as greedy algorithm)
     let availableCollectorsCount = $derived.by(() => {
          if (!peersData?.data) return 0;

          const collectors = new Set<string>();
          for (const peer of peersData.data) {
               // IP family filter
               if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) continue;
               if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) continue;
               // Project filter
               if (project === "rv" && isRipeRis(peer.collector)) continue;
               if (project === "ris" && !isRipeRis(peer.collector)) continue;
               // Include collector if it has at least one peer matching filters
               collectors.add(peer.collector);
          }
          return collectors.size;
     });

     // Filtered stats for display (what user selected)
     let filteredStats = $derived.by(() => {
          if (!peersData?.data) {
               return {
                    totalAsns: 0,
                    totalCountries: 0,
                    totalFullFeedPeers: 0,
               };
          }

          const filteredPeers = peersData.data.filter((peer) => {
               // IP family filter
               if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
               if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
               // Project filter
               if (project === "rv" && isRipeRis(peer.collector)) return false;
               if (project === "ris" && !isRipeRis(peer.collector))
                    return false;
               return true;
          });

          const allAsns = new Set(filteredPeers.map((p) => p.asn));
          const allCountries = new Set<string>();

          for (const peer of filteredPeers) {
               const info = asnData.get(peer.asn);
               if (info?.country) {
                    allCountries.add(info.country);
               }
          }

          return {
               totalAsns: allAsns.size,
               totalCountries: allCountries.size,
               totalFullFeedPeers: filteredPeers.length,
          };
     });

     // Update maxCollectors when it exceeds available
     $effect(() => {
          if (maxCollectors > availableCollectorsCount) {
               maxCollectors = availableCollectorsCount;
          }
     });

     // Modal state
     let showAllAsnsModal = $state(false);

     // Calculate coverage when inputs change
     let result = $derived.by(() => {
          if (!peersData?.data || asnData.size === 0) {
               return null;
          }

          return calculateGreedyCoverage(
               peersData.data,
               asnData,
               goal,
               ipFamily,
               project,
               maxCollectors,
          );
     });

     // Calculate coverage curve data for chart
     let coverageCurveData = $derived.by(() => {
          if (!peersData?.data || asnData.size === 0) {
               return {
                    labels: [],
                    asnCoverage: { counts: [], percents: [] },
                    countryCoverage: { counts: [], percents: [] },
                    currentMax: 0,
               };
          }

          // Use the actual available collectors count for chart x-axis
          const chartMax = availableCollectorsCount;

          const data = calculateCoverageCurve(
               peersData.data,
               asnData,
               ipFamily,
               project,
               chartMax,
          );

          return {
               ...data,
               currentMax: maxCollectors,
          };
     });

     // Calculate all covered ASNs and countries from selected collectors
     let coveredData = $derived.by(() => {
          if (!result) {
               return { asns: new Set<number>(), countries: new Set<string>() };
          }

          const allAsns = new Set<number>();
          const allCountries = new Set<string>();

          for (const step of result.coverageByStep) {
               const details = result.collectorDetails.get(step.collector);
               if (details) {
                    for (const asn of details.uniqueAsns) {
                         allAsns.add(asn);
                    }
                    for (const country of details.uniqueCountries) {
                         allCountries.add(country);
                    }
               }
          }

          return { asns: allAsns, countries: allCountries };
     });

     // Get all covered ASNs with their country info for the modal
     let coveredAsnsWithCountries = $derived.by(() => {
          const asns = [...coveredData.asns].sort((a, b) => a - b);
          return asns.map((asn) => {
               const info = asnData.get(asn);
               return {
                    asn,
                    name: info?.name || "Unknown",
                    country: info?.country || "",
                    countryName: info?.country_name || "",
               };
          });
     });

     // Total counts for reference - ASNs with full-feed peers (baseline for percentage calculation)
     let totalStats = $derived.by(() => {
          if (!peersData?.data) {
               return {
                    totalAsns: 0,
                    totalCountries: 0,
                    totalFullFeedPeers: 0,
                    fullFeedAsns: 0,
               };
          }

          const filteredPeers = peersData.data.filter((peer) => {
               // IP family filter only (no project filter - use all collectors as baseline)
               if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
               if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
               return true;
          });

          // ASNs with at least one full-feed peer (useful for BGP monitoring)
          const fullFeedPeers = filteredPeers.filter(isFullFeed);
          const fullFeedAsns = new Set(fullFeedPeers.map((p) => p.asn));

          const allAsns = new Set(filteredPeers.map((p) => p.asn));
          const allCountries = new Set<string>();

          for (const peer of filteredPeers) {
               const info = asnData.get(peer.asn);
               if (info?.country) {
                    allCountries.add(info.country);
               }
          }

          return {
               totalAsns: allAsns.size,
               totalCountries: allCountries.size,
               totalFullFeedPeers: filteredPeers.length,
               fullFeedAsns: fullFeedAsns.size,
          };
     });

     // Coverage percentages for both metrics - denominator is ASNs with full-feed peers
     let asnCoveragePercent = $derived.by(() => {
          if (!result || totalStats.fullFeedAsns === 0) return 0;
          return Math.round(
               (coveredData.asns.size / totalStats.fullFeedAsns) * 100,
          );
     });

     let countryCoveragePercent = $derived.by(() => {
          if (!result || totalStats.totalCountries === 0) return 0;
          return Math.round(
               (coveredData.countries.size / totalStats.totalCountries) * 100,
          );
     });

     // Usage examples
     let collectorsStr = $derived(
          result?.selectedCollectors.slice().sort().join(",") || "",
     );
     let monocleCmd = $derived(
          `monocle search --collectors ${collectorsStr} --time-start "2024-01-01T00:00:00Z" --time-end "2024-01-01T01:00:00Z"`,
     );
     let rustCode = $derived(
          `let broker = BgpkitBroker::new()
    .ts_start("1634693400")
    .ts_end("1634693400")
    .collector_id("${collectorsStr}");`,
     );
</script>

<div class="space-y-6">
     <!-- Controls -->
     <div class="bg-base-200 p-4 rounded-lg">
          <h3 class="text-lg font-semibold mb-4">Route Collector Selector</h3>
          <p class="text-sm text-base-content/70 mb-4">
               Select a subset of route collectors that provides the best
               coverage for building a BGP monitoring pipeline or searching for
               BGP messages. Only full-feed peers are considered since they
               provide the most complete routing data.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               <!-- Goal Selection -->
               <div class="form-control">
                    <label class="label" for="goal-select">
                         <span class="label-text">Optimization Goal</span>
                    </label>
                    <select
                         id="goal-select"
                         class="select select-bordered"
                         bind:value={goal}
                    >
                         <option value="asns">Unique Peer ASNs</option>
                         <option value="countries">Unique Countries</option>
                    </select>
               </div>

               <!-- IP Family -->
               <div class="form-control">
                    <label class="label" for="ip-family-select">
                         <span class="label-text">IP Family</span>
                    </label>
                    <select
                         id="ip-family-select"
                         class="select select-bordered"
                         bind:value={ipFamily}
                    >
                         <option value="all">Both IPv4 & IPv6</option>
                         <option value="ipv4">IPv4 Only</option>
                         <option value="ipv6">IPv6 Only</option>
                    </select>
               </div>

               <!-- Project Selection -->
               <div class="form-control">
                    <label class="label" for="project-select">
                         <span class="label-text">Project</span>
                    </label>
                    <select
                         id="project-select"
                         class="select select-bordered"
                         bind:value={project}
                    >
                         <option value="any">Any Project</option>
                         <option value="rv">RouteViews Only</option>
                         <option value="ris">RIPE RIS Only</option>
                         <option value="balanced">Balanced (Half-Half)</option>
                    </select>
               </div>

               <!-- Max Collectors -->
               <div class="form-control">
                    <label class="label" for="max-collectors-input">
                         <span class="label-text"
                              >Maximum Collectors ({sliderValue})</span
                         >
                    </label>
                    <input
                         id="max-collectors-input"
                         type="range"
                         class="range range-primary"
                         bind:value={sliderValue}
                         min="1"
                         max={availableCollectorsCount}
                         step="1"
                         onmouseup={handleSliderChange}
                         ontouchend={handleSliderChange}
                    />
                    <div class="w-full flex justify-between text-xs px-2 mt-1">
                         <span>1</span>
                         <span>{availableCollectorsCount}</span>
                    </div>
               </div>
          </div>
     </div>

     <!-- Results Summary -->
      {#if result}
           <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                <div class="bg-base-200 rounded-lg p-2 sm:p-4 shadow">
                     <div class="text-xs sm:text-sm text-base-content/70">
                          Selected Collectors
                     </div>
                     <div class="text-2xl sm:text-3xl font-bold mt-1">
                          {result.selectedCollectors.length}
                     </div>
                     <div class="text-xs sm:text-sm text-base-content/60 mt-1">
                          of {result.availableCollectorsCount} available
                     </div>
                </div>

                <div
                     class="bg-base-200 rounded-lg p-2 sm:p-4 shadow {goal ===
                     'asns'
                          ? 'ring-2 sm:ring-4 ring-blue-300'
                          : ''}"
                >
                     <div class="text-xs sm:text-sm text-base-content/70">
                          ASNs with Full-feed Peers
                     </div>
                     <div class="text-2xl sm:text-3xl font-bold mt-1">
                          {coveredData.asns.size}
                     </div>
                     <div class="text-xs sm:text-sm text-base-content/60 mt-1">
                          {asnCoveragePercent}% of {totalStats.fullFeedAsns} total
                     </div>
                </div>

                <div
                     class="bg-base-200 rounded-lg p-2 sm:p-4 shadow {goal ===
                     'countries'
                          ? 'ring-2 sm:ring-4 ring-green-300'
                          : ''}"
                >
                     <div class="text-xs sm:text-sm text-base-content/70">
                          Countries Covered
                     </div>
                     <div class="text-2xl sm:text-3xl font-bold mt-1">
                          {coveredData.countries.size}
                     </div>
                     <div class="text-xs sm:text-sm text-base-content/60 mt-1">
                          {countryCoveragePercent}% of {totalStats.totalCountries}
                          countries
                     </div>
                </div>

                <div class="bg-base-200 rounded-lg p-2 sm:p-4 shadow">
                     <div class="text-xs sm:text-sm text-base-content/70">
                          Full-feed Peers
                     </div>
                     <div class="text-2xl sm:text-3xl font-bold mt-1">
                          {selectedFullFeedPeers}
                     </div>
                     <div class="text-xs sm:text-sm text-base-content/60 mt-1">
                          in selected
                     </div>
                </div>

                <div class="bg-base-200 rounded-lg p-2 sm:p-4 shadow">
                     <div class="text-xs sm:text-sm text-base-content/70">
                          Data Volume
                     </div>
                     <div class="text-2xl sm:text-3xl font-bold mt-1">
                          {fileSizes.totalPerRound > 0
                               ? formatBytes(fileSizes.totalPerRound)
                               : "-"}
                     </div>
                     <div class="text-xs sm:text-sm text-base-content/60 mt-1">
                          per round
                     </div>
                </div>

                <div class="bg-base-200 rounded-lg p-2 sm:p-4 shadow">
                     <div class="text-xs sm:text-sm text-base-content/70">
                          Data Volume
                     </div>
                     <div class="text-2xl sm:text-3xl font-bold mt-1">
                          {fileSizes.totalPerHour > 0
                               ? formatBytes(fileSizes.totalPerHour)
                               : "-"}
                     </div>
                     <div class="text-xs sm:text-sm text-base-content/60 mt-1">
                          per hour
                     </div>
                </div>
           </div>

          <!-- Coverage Chart -->
          <div class="bg-base-200 p-4 rounded-lg">
               <CoverageChart
                    labels={coverageCurveData.labels}
                    asnCoverage={coverageCurveData.asnCoverage}
                    countryCoverage={coverageCurveData.countryCoverage}
                    currentMax={coverageCurveData.currentMax}
                    sliderPosition={sliderValue}
                    onPointClick={(value) => {
                         sliderValue = value;
                         maxCollectors = value;
                    }}
               />
          </div>

          <!-- Selected Collectors Table -->
          <div class="overflow-auto max-h-[60vh]">
               <table class="table table-zebra table-sm">
                    <thead class="sticky top-0 z-10">
                         <tr class="bg-base-200">
                              <th class="w-16">#</th>
                              <th>Collector</th>
                              <th>Project</th>
                              <th class="text-right">New ASNs</th>
                              <th class="text-right">Cumulative</th>
                              <th class="text-right">Full-feed Peers</th>
                         </tr>
                    </thead>
                    <tbody>
                         {#each result.coverageByStep as step, index}
                              {@const details = result.collectorDetails.get(
                                   step.collector,
                              )}
                              {@const isRis = isRipeRis(step.collector)}
                              <tr>
                                   <td class="font-mono">{index + 1}</td>
                                   <td class="font-semibold"
                                        >{step.collector}</td
                                   >
                                   <td>
                                        <span
                                             class="badge {isRis
                                                  ? 'badge-warning'
                                                  : 'badge-info'} badge-sm"
                                        >
                                             {isRis ? "RIPE RIS" : "RouteViews"}
                                        </span>
                                   </td>
                                   <td class="text-right text-success"
                                        >+{step.newCoverage}</td
                                   >
                                   <td class="text-right font-mono"
                                        >{step.cumulativeCoverage}</td
                                   >
                                   <td class="text-right font-mono">
                                        {details?.fullFeedPeers.length || 0}
                                   </td>
                              </tr>
                         {/each}
                    </tbody>
               </table>
          </div>

          <!-- View All ASNs Button -->
          <div class="flex justify-center">
               <button
                    class="btn btn-outline btn-primary"
                    onclick={() => (showAllAsnsModal = true)}
               >
                    View Covered ASNs ({coveredData.asns.size})
               </button>
          </div>

          <!-- All ASNs Modal -->
          {#if showAllAsnsModal}
               <div class="modal modal-open">
                    <div class="modal-box max-w-4xl max-h-[80vh] flex flex-col">
                         <div class="flex justify-between items-center mb-4">
                              <h3 class="text-lg font-bold">
                                   Covered ASNs ({coveredData.asns.size})
                              </h3>
                              <button
                                   class="btn btn-sm btn-ghost"
                                   onclick={() => (showAllAsnsModal = false)}
                              >
                                   ✕
                              </button>
                         </div>

                         <div class="overflow-auto flex-1">
                              <table class="table table-sm table-zebra">
                                   <thead class="sticky top-0 bg-base-200">
                                        <tr>
                                             <th class="w-24">ASN</th>
                                             <th class="w-48">Organization</th>
                                             <th class="w-56">Country</th>
                                        </tr>
                                   </thead>
                                   <tbody>
                                        {#each coveredAsnsWithCountries as item}
                                             <tr>
                                                  <td class="font-mono"
                                                       >AS{item.asn}</td
                                                  >
                                                  <td
                                                       class="truncate max-w-[200px]"
                                                       title={item.name}
                                                       >{item.name}</td
                                                  >
                                                  <td>
                                                       {#if item.country}
                                                            <span
                                                                 class="flex items-center gap-1"
                                                            >
                                                                 {countryToFlag(
                                                                      item.country,
                                                                 )}
                                                                 {item.country}
                                                                 {#if item.countryName}
                                                                      <span
                                                                           class="text-xs text-base-content/50"
                                                                           >({item.countryName})</span
                                                                      >
                                                                 {/if}
                                                            </span>
                                                       {:else}
                                                            <span
                                                                 class="text-base-content/50"
                                                                 >--</span
                                                            >
                                                       {/if}
                                                  </td>
                                             </tr>
                                        {/each}
                                   </tbody>
                              </table>
                         </div>

                         <div class="modal-action mt-4">
                              <button
                                   class="btn btn-primary"
                                   onclick={() => (showAllAsnsModal = false)}
                              >
                                   Close
                              </button>
                         </div>
                    </div>
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                         class="modal-backdrop"
                         onclick={() => (showAllAsnsModal = false)}
                         role="button"
                         tabindex="-1"
                         aria-label="Close modal"
                    ></div>
               </div>
          {/if}

          <!-- Copy Results -->
          <div class="bg-base-200 p-4 rounded-lg">
               <h4 class="font-semibold mb-2">Selected Collectors List</h4>
               <div class="flex gap-2">
                    <input
                         type="text"
                         class="input input-bordered flex-1 font-mono text-sm"
                         value={collectorsStr}
                         readonly
                    />
                    <button
                         class="btn btn-primary btn-sm"
                         onclick={() => {
                              navigator.clipboard.writeText(collectorsStr);
                         }}
                    >
                         Copy
                    </button>
               </div>
          </div>

          <!-- Usage Examples -->
          <div class="space-y-4">
               <!-- Monocle Example -->
               <div class="bg-base-200 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Monocle CLI</h4>
                    <p class="text-sm text-base-content/70 mb-2">
                         Use the selected collectors with <a
                              href="https://bgpkit.com/tools/monocle/"
                              class="link link-primary"
                              target="_blank">monocle</a
                         > to search for BGP messages:
                    </p>
                    <div class="relative">
                         <pre
                              class="bg-base-300 p-3 rounded text-sm font-mono overflow-x-auto"><code
                                   >{monocleCmd}</code
                              ></pre>
                         <button
                              class="btn btn-xs btn-ghost absolute top-2 right-2"
                              onclick={() =>
                                   navigator.clipboard.writeText(monocleCmd)}
                              title="Copy command"
                              aria-label="Copy monocle command"
                         >
                              <svg
                                   xmlns="http://www.w3.org/2000/svg"
                                   class="h-4 w-4"
                                   fill="none"
                                   viewBox="0 0 24 24"
                                   stroke="currentColor"
                              >
                                   <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                   />
                              </svg>
                         </button>
                    </div>
               </div>

               <!-- Rust bgpkit-broker Example -->
               <div class="bg-base-200 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Rust (bgpkit-broker)</h4>
                    <p class="text-sm text-base-content/70 mb-2">
                         Use the selected collectors in your Rust code with the <a
                              href="https://bgpkit.com/tools/broker/"
                              class="link link-primary"
                              target="_blank">bgpkit-broker</a
                         > crate:
                    </p>
                    <div class="relative">
                         <pre
                              class="bg-base-300 p-3 rounded text-sm font-mono overflow-x-auto"><code
                                   >{rustCode}</code
                              ></pre>
                         <button
                              class="btn btn-xs btn-ghost absolute top-2 right-2"
                              onclick={() =>
                                   navigator.clipboard.writeText(rustCode)}
                              title="Copy code"
                              aria-label="Copy Rust code"
                         >
                              <svg
                                   xmlns="http://www.w3.org/2000/svg"
                                   class="h-4 w-4"
                                   fill="none"
                                   viewBox="0 0 24 24"
                                   stroke="currentColor"
                              >
                                   <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                   />
                              </svg>
                         </button>
                    </div>
               </div>
          </div>
     {:else}
          <div class="flex justify-center py-8">
               <span class="loading loading-dots loading-lg"></span>
          </div>
     {/if}
</div>
