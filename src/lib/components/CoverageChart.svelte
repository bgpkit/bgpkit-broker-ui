<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';

	let {
		labels,
		asnData,
		countryData,
	}: {
		labels: number[];
		asnData: number[];
		countryData: number[];
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	onMount(() => {
		if (!canvas) return;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: labels.map(String),
				datasets: [
					{
						label: 'ASNs Covered',
						data: asnData,
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						tension: 0.3,
						fill: true,
					},
					{
						label: 'Countries Covered',
						data: countryData,
						borderColor: 'rgb(34, 197, 94)',
						backgroundColor: 'rgba(34, 197, 94, 0.1)',
						tension: 0.3,
						fill: true,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					title: {
						display: true,
						text: 'Coverage vs Number of Collectors',
					},
					legend: {
						display: true,
						position: 'top',
					},
					tooltip: {
						callbacks: {
							title: (items) => `Collectors: ${items[0].label}`,
						},
					},
				},
				scales: {
					x: {
						display: true,
						title: {
							display: true,
							text: 'Number of Collectors',
						},
					},
					y: {
						display: true,
						title: {
							display: true,
							text: 'Coverage Count',
						},
						beginAtZero: true,
					},
				},
			},
		});
	});

	// Update chart when data changes
	$effect(() => {
		if (chart) {
			chart.data.labels = labels.map(String);
			chart.data.datasets[0].data = asnData;
			chart.data.datasets[1].data = countryData;
			chart.update();
		}
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
			chart = null;
		}
	});
</script>

<div class="w-full h-80">
	<canvas bind:this={canvas}></canvas>
</div>
