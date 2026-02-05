<script lang="ts">
	import moment from "moment";

	const { duration } = moment;

	let { last_updated_ts }: { last_updated_ts: string } = $props();

	const last_check_ts = new Date(`${last_updated_ts}Z`);
	let diff = new Date().getTime() - last_check_ts.getTime();
</script>

<div class="flex flex-col sm:flex-row justify-between items-center gap-4">
	<div class="flex items-center gap-4 w-full sm:w-auto">
		<a href="https://bgpkit.com">
			<img
				class="h-12 sm:h-16 w-auto max-w-[80px] sm:max-w-[100px]"
				src="https://spaces.bgpkit.org/assets/logos/icon-transparent.png"
				alt="bgpkit logo"
			/>
		</a>
		<div class="text-center sm:text-left">
			<h1 class="text-2xl sm:text-3xl lg:text-4xl">BGPKIT Broker Status</h1>
			<p class="text-sm sm:text-base lg:text-xl">
				Last updated: {duration(diff / 1000, "seconds").humanize()} ago
				(UTC {last_updated_ts}Z)
			</p>
		</div>
	</div>
	<div>
		<label class="flex cursor-pointer gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="5" />
				<path
					d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
				/>
			</svg>
			<input type="checkbox" value="dark" class="toggle theme-controller" />
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
			</svg>
		</label>
	</div>
</div>
