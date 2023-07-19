<script>
	import {Table, tableMapperValues} from '@skeletonlabs/skeleton';
	export let data;
	console.log(data)

	const sourceData = data.data;
	for(let entry of sourceData) {
		entry.url = `<a class="anchor" href="${entry.url}" target="_blank">Download</a>`;
	}
	const tableSimple = {
		// A list of heading labels.
		head: ['Collector ID', 'Type', 'Size', 'Time', 'Download'],
		// The data visibly shown in your table body UI.
		body: tableMapperValues(sourceData, ['collector_id', 'data_type', 'rough_size', 'ts_start', 'url']),
		// Optional: A list of footer labels.
		foot: ['Total', '', `<code class="code">${sourceData.length}</code>`]
	};
</script>

<div class="container mx-auto p-8 space-y-8">
	<h1 class="h1">BGPKIT Broker Latest Data</h1>

	<Table source={tableSimple} />
</div>
