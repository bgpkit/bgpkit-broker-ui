<script>
	import {Table, tableMapperValues} from '@skeletonlabs/skeleton';
	import {duration} from "moment/moment";
	import filesize from "file-size";
	export let data;

	const CHECKMARK_ICON =`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="green" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg>`;
	const WARNING_ICON =`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="red" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /> </svg>`;
	const TRASH_ICON =`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="gray" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /> </svg> `;

	export const DEPRECATED_COLLECTORS = [
		"rrc02",
		"rrc08",
		"rrc09",
		"route-views.jinx",
		"route-views.saopaulo",
	]

	// massage data format
	const sourceData = data.data;
	const now_ts = new Date();
	const last_check_ts = new Date(`${data.meta.latest_update_ts}Z`);
	let diff = now_ts - last_check_ts;

	function deleteAfterPattern(inputString) {
		// Regular expression to match the pattern 'xxxx.xx' where x is a digit
		const pattern = /\d{4}\.\d{2}/;

		// Find the index of the pattern in the input string
		const matchIndex = inputString.search(pattern);

		// If the pattern is found, delete everything after it, else return the original string
		return matchIndex >= 0 ? inputString.slice(0, matchIndex) : inputString;
	}

	for(let entry of sourceData) {
		const delay = (last_check_ts - new Date(`${entry.ts_start}Z`))/1000;
		let variant = CHECKMARK_ICON;
		if (delay > 60*60 && entry.data_type==="update") {
			// delay over 1 hour for updates files
			variant = WARNING_ICON;
		} else if (delay > 60*60*24 && entry.data_type==="rib"){
			// delay over 24 hour for RIB files
			variant = WARNING_ICON;
		}
		if(DEPRECATED_COLLECTORS.includes(entry.collector_id)) {
			variant = TRASH_ICON;
		}

		entry.collector_id =
				`<a class="anchor" href="${deleteAfterPattern(entry.url)}" target="_blank">${entry.collector_id}</a>`;
		entry.url = `<a class="anchor" href="${entry.url}" target="_blank">Download</a>`;
		entry.status = `<span class="h4"> ${variant} </span>`;
		entry.ts_start = entry.ts_start.replace('T', ' ');
		entry.rough_size = filesize(entry.rough_size).human('si');
		entry.delay = `${duration(delay, 'seconds').humanize()} ago`;
	}

	const tableSimple = {
		// A list of heading labels.
		head: ['Collector ID', 'Status', 'File Time UTC', 'Last Updated At', 'Type', 'Size',  'Download'],
		// The data visibly shown in your table body UI.
		body: tableMapperValues(sourceData, ['collector_id', 'status', 'ts_start', 'delay', 'data_type', 'rough_size',  'url']),
		// Optional: A list of footer labels.
		foot: ['Total', `<code class="code">${sourceData.length}</code> collectors`]
	};
</script>

<div class="container mx-auto p-8 space-y-8">
	<div class="flex items-center">
		<a href="https://bgpkit.com">
			<img class="h-20 mr-8 " src="https://spaces.bgpkit.org/assets/logos/icon-transparent.png" alt="bgpkit logo"/>
		</a>
		<div>
			<h1 class="h1"> BGPKIT Broker Latest Data</h1>
			<h2 class="h3"> Last updated: {duration(diff/1000, 'seconds').humanize()} ago <span class="h6">({data.meta.latest_update_ts+'Z'})</span> </h2>
		</div>
	</div>
	<Table source={tableSimple} />
</div>
