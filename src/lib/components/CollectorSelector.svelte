<script lang="ts">
	import type { PeersData, AsnInfo } from "../types";
	import { calculateGreedyCoverage, countryToFlag, isRipeRis } from "../common";

	let {
		peersData,
		asnData,
		isActive = true,
	}: {
		peersData: PeersData;
		asnData: Map<number, AsnInfo>;
		isActive?: boolean;
	} = $props();

	// Selection state
	let goal = $state<"asns" | "countries">("asns");
	let ipFamily = $state<"all" | "ipv4" | "ipv6">("all");
	let project = $state<"any" | "rv" | "ris" | "balanced">("any");
	let maxCollectors = $state(10);

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

	// Total counts for reference
	let totalStats = $derived.by(() => {
		if (!peersData?.data) {
			return { totalAsns: 0, totalCountries: 0, totalFullFeedPeers: 0 };
		}

		const filteredPeers = peersData.data.filter((peer) => {
			// IP family filter
			if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
			if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
			// Project filter
			if (project === "rv" && isRipeRis(peer.collector)) return false;
			if (project === "ris" && !isRipeRis(peer.collector)) return false;
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

	// Coverage percentage
	let coveragePercent = $derived.by(() => {
		if (!result) return 0;
		const total =
			goal === "asns" ? totalStats.totalAsns : totalStats.totalCountries;
		if (total === 0) return 0;
		return Math.round((result.totalCoverage / total) * 100);
	});

	// Usage examples
	let collectorsStr = $derived(result?.selectedCollectors.slice().sort().join(",") || "");
	let monocleCmd = $derived(
		`monocle search --collectors ${collectorsStr} --time-start "2024-01-01T00:00:00Z" --time-end "2024-01-01T01:00:00Z"`
	);
	let rustCode = $derived(
		`let broker = BgpkitBroker::new()
    .ts_start("1634693400")
    .ts_end("1634693400")
    .collector_id("${collectorsStr}");`
	);
</script>

<div class="space-y-6">
	<!-- Controls -->
	<div class="bg-base-200 p-4 rounded-lg">
		<h3 class="text-lg font-semibold mb-4">Coverage Optimizer</h3>
		<p class="text-sm text-base-content/70 mb-4">
			Select the minimum set of collectors that provide maximum coverage using
			the greedy algorithm. Only full-feed peers are considered.
		</p>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<!-- Goal Selection -->
			<div class="form-control">
				<label class="label" for="goal-select">
					<span class="label-text">Optimization Goal</span>
				</label>
				<select id="goal-select" class="select select-bordered" bind:value={goal}>
					<option value="asns">Unique Peer ASNs</option>
					<option value="countries">Unique Countries</option>
				</select>
			</div>

			<!-- IP Family -->
			<div class="form-control">
				<label class="label" for="ip-family-select">
					<span class="label-text">IP Family</span>
				</label>
				<select id="ip-family-select" class="select select-bordered" bind:value={ipFamily}>
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
				<select id="project-select" class="select select-bordered" bind:value={project}>
					<option value="any">Any Project</option>
					<option value="rv">RouteViews Only</option>
					<option value="ris">RIPE RIS Only</option>
					<option value="balanced">Balanced (Half-Half)</option>
				</select>
			</div>

			<!-- Max Collectors -->
			<div class="form-control">
				<label class="label" for="max-collectors-input">
					<span class="label-text">Maximum Collectors</span>
				</label>
				<input
					id="max-collectors-input"
					type="number"
					class="input input-bordered"
					bind:value={maxCollectors}
					min="1"
					max="50"
				/>
			</div>
		</div>
	</div>

	<!-- Results Summary -->
	{#if result}
		<div class="stats shadow bg-base-200">
			<div class="stat">
				<div class="stat-title">Selected Collectors</div>
				<div class="stat-value text-2xl">
					{result.selectedCollectors.length}
				</div>
				<div class="stat-desc">of {result.collectorDetails.size} available</div>
			</div>

			<div class="stat">
				<div class="stat-title">
					{goal === "asns" ? "ASNs Covered" : "Countries Covered"}
				</div>
				<div class="stat-value text-2xl">{result.totalCoverage}</div>
				<div class="stat-desc">
					{coveragePercent}% of
					{goal === "asns" ? totalStats.totalAsns : totalStats.totalCountries}
					total
				</div>
			</div>

			<div class="stat">
				<div class="stat-title">Full-feed Peers</div>
				<div class="stat-value text-2xl">
					{result.coverageByStep.reduce((sum, step) => {
						const details = result.collectorDetails.get(step.collector);
						return sum + (details?.fullFeedPeers.length || 0);
					}, 0)}
				</div>
				<div class="stat-desc">considered in optimization</div>
			</div>
		</div>

		<!-- Selected Collectors Table -->
		<div class="overflow-auto max-h-[60vh]">
			<table class="table table-zebra table-sm">
				<thead class="sticky top-0 z-10">
					<tr class="bg-base-200">
						<th class="w-16">Step</th>
						<th>Collector</th>
						<th class="text-right">New Coverage</th>
						<th class="text-right">Cumulative</th>
						<th class="text-right">Full-feed Peers</th>
						<th>
							Top ASNs
							<span class="text-xs text-base-content/50" title="Sorted by total IPv4 prefixes advertised">(?)</span>
						</th>
						<th>Top Countries</th>
					</tr>
				</thead>
				<tbody>
					{#each result.coverageByStep as step, index}
						{@const details = result.collectorDetails.get(step.collector)}
						<tr>
							<td class="font-mono">{index + 1}</td>
							<td class="font-semibold">{step.collector}</td>
							<td class="text-right text-success">+{step.newCoverage}</td>
							<td class="text-right font-mono">{step.cumulativeCoverage}</td>
							<td class="text-right font-mono">
								{details?.fullFeedPeers.length || 0}
							</td>
							<td>
								{#if details}
									{@const topAsns = [...details.uniqueAsns]
										.sort((a, b) => {
											const peerA = details.fullFeedPeers.find((p) => p.asn === a);
											const peerB = details.fullFeedPeers.find((p) => p.asn === b);
											// Sort by total prefixes (IPv4 + IPv6) advertised
											const prefixesA = (peerA?.num_v4_pfxs || 0) + (peerA?.num_v6_pfxs || 0);
											const prefixesB = (peerB?.num_v4_pfxs || 0) + (peerB?.num_v6_pfxs || 0);
											return prefixesB - prefixesA;
										})
										.slice(0, 3)}
									<div class="flex flex-wrap gap-1">
										{#each topAsns as asn}
											<span class="badge badge-sm badge-outline"
												>AS{asn}</span
											>
										{/each}
									</div>
								{/if}
							</td>
							<td>
								{#if details}
									{@const topCountries = [...details.uniqueCountries].slice(0, 3)}
									<div class="flex flex-wrap gap-1">
										{#each topCountries as country}
											<span class="badge badge-sm badge-outline gap-1">
												{countryToFlag(country)}
												{country}
											</span>
										{/each}
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

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
					Use the selected collectors with <a href="https://bgpkit.com/tools/monocle/" class="link link-primary" target="_blank">monocle</a> to search for BGP messages:
				</p>
				<div class="relative">
					<pre class="bg-base-300 p-3 rounded text-sm font-mono overflow-x-auto"><code>{monocleCmd}</code></pre>
					<button
						class="btn btn-xs btn-ghost absolute top-2 right-2"
						onclick={() => navigator.clipboard.writeText(monocleCmd)}
						title="Copy command"
						aria-label="Copy monocle command"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Rust bgpkit-broker Example -->
			<div class="bg-base-200 p-4 rounded-lg">
				<h4 class="font-semibold mb-2">Rust (bgpkit-broker)</h4>
				<p class="text-sm text-base-content/70 mb-2">
					Use the selected collectors in your Rust code with the <a href="https://bgpkit.com/tools/broker/" class="link link-primary" target="_blank">bgpkit-broker</a> crate:
				</p>
				<div class="relative">
					<pre class="bg-base-300 p-3 rounded text-sm font-mono overflow-x-auto"><code>{rustCode}</code></pre>
					<button
						class="btn btn-xs btn-ghost absolute top-2 right-2"
						onclick={() => navigator.clipboard.writeText(rustCode)}
						title="Copy code"
						aria-label="Copy Rust code"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
