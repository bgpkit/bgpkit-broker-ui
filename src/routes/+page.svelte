<script lang="ts">
	import BrokerTable from "$lib/tables/brokerTable.svelte";
	import Header from "$lib/header.svelte";
	import CollectorStats from "$lib/stats/collectorStats.svelte";
	import OnTimeStats from "$lib/stats/onTimeStats.svelte";
	import PeersTable from "$lib/tables/peersTable.svelte";
	import PeersStats from "$lib/stats/peersStats.svelte";

	/** @type {import('./$types').PageData} */
	let { data } = $props();

	let brokerData = $derived(data.brokerData);
	let peersData = $derived(data.peersData);
	let showOnlyFullFeed = $state(false);
</script>

<div class="container mx-auto my-10">
	{#if brokerData}
		<Header last_updated_ts={brokerData.meta.latest_update_ts} />
	{:else}
		<span class="loading loading-dots loading-lg"></span>
	{/if}

	<div class="flex pt-8 px-auto gap-8">
		<CollectorStats {brokerData} />
		<OnTimeStats {brokerData} />
		<PeersStats {peersData} />
	</div>

	<div role="tablist" class="tabs tabs-bordered tabs-lift tabs-lg pt-8">
		<input
			type="radio"
			name="tab"
			role="tab"
			class="tab"
			checked="checked"
			aria-label="Route Collectors"
		/>
		<div
			role="tabpanel"
			class="tab-content bg-base-100 border-base-300 p-6"
		>
			{#if brokerData}
				<BrokerTable {brokerData} />
			{:else}
				<span class="loading loading-dots loading-lg"></span>
			{/if}
		</div>

		<input
			type="radio"
			name="tab"
			role="tab"
			class="tab"
			aria-label="Collector Peers"
		/>
		<div
			role="tabpanel"
			class="tab-content bg-base-100 border-base-300 rounded-box p-6"
		>
			{#if peersData}
				<div class="flex justify-end mb-4">
					<label class="cursor-pointer label flex items-center gap-2">
						<span class="label-text">Show only full-feed peers</span>
						<input type="checkbox" bind:checked={showOnlyFullFeed} class="checkbox checkbox-primary" />
					</label>
				</div>
				<PeersTable {peersData} showOnlyFullFeed={showOnlyFullFeed} />
			{:else}
				<span class="loading loading-dots loading-lg"></span>
			{/if}
		</div>
	</div>

</div>
