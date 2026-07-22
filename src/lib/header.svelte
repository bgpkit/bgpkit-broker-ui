<script lang="ts">
	import { formatDurationAgo } from "$lib/format";

	let { last_updated_ts }: { last_updated_ts?: string } = $props();

	let diff = $derived(
		last_updated_ts
			? Date.now() - new Date(`${last_updated_ts}Z`).getTime()
			: null,
	);
</script>

<header
	class="sticky top-0 z-50 border-b border-base-300 bg-base-100/90 backdrop-blur"
>
	<div class="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
		<div class="flex min-w-0 items-center gap-2.5">
			<a href="https://bgpkit.com" class="shrink-0">
				<img
					class="h-7 w-auto"
					src="https://spaces.bgpkit.org/assets/logos/icon-transparent.png"
					alt="bgpkit logo"
				/>
			</a>
			<div class="flex items-baseline gap-2 truncate text-[15px]">
				<span class="font-semibold tracking-tight">BGPKIT Broker</span>
				<span class="text-base-content/50">Data Status</span>
			</div>
		</div>
		<div class="flex shrink-0 items-center gap-3 sm:gap-4">
			{#if diff !== null && last_updated_ts}
				<span
					class="hidden items-center gap-1.5 text-xs text-base-content/55 md:flex"
					title="UTC {last_updated_ts}Z"
				>
					<span class="status status-success status-sm"></span>
					updated {formatDurationAgo(diff / 1000)}
				</span>
			{/if}
			<a
				href="https://api.bgpkit.com/docs"
				target="_blank"
				class="hidden text-sm text-base-content/60 hover:text-base-content sm:block"
				>API Docs</a
			>
			<a
				href="https://github.com/bgpkit/bgpkit-broker-ui"
				target="_blank"
				class="text-base-content/60 hover:text-base-content"
				title="Source on GitHub"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path
						d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 2.89-.39c.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
					/>
				</svg>
			</a>
			<label class="flex cursor-pointer items-center gap-1.5 text-base-content/60">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="15"
					height="15"
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
				<input type="checkbox" value="dark" class="toggle toggle-sm theme-controller" />
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="15"
					height="15"
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
</header>
