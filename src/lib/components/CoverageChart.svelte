<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import annotationPlugin from 'chartjs-plugin-annotation';

	Chart.register(annotationPlugin);

	let {
		labels,
		asnCoverage,
		countryCoverage,
		currentMax,
		sliderPosition,
		onPointClick,
	}: {
		labels: number[];
		asnCoverage: { counts: number[]; percents: number[] };
		countryCoverage: { counts: number[]; percents: number[] };
		currentMax: number;
		sliderPosition: number;
		onPointClick?: (value: number) => void;
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
						label: 'ASN Coverage (ASN-optimized)',
						data: asnCoverage.percents,
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						yAxisID: 'y',
						tension: 0.3,
						pointRadius: 3,
						pointHoverRadius: 5,
						fill: true,
					},
					{
						label: 'Country Coverage (Country-optimized)',
						data: countryCoverage.percents,
						borderColor: 'rgb(34, 197, 94)',
						backgroundColor: 'rgba(34, 197, 94, 0.1)',
						yAxisID: 'y',
						tension: 0.3,
						pointRadius: 3,
						pointHoverRadius: 5,
						fill: true,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				onClick: (event, elements) => {
					if (elements.length > 0 && onPointClick) {
						const index = elements[0].index;
						const value = labels[index];
						onPointClick(value);
					}
				},
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					title: {
						display: true,
						text: 'Coverage vs Number of Collectors (click to select)',
					},
					legend: {
						display: true,
						position: 'top',
					},
					tooltip: {
						callbacks: {
							title: (items) => `${items[0].label} Collectors`,
							label: (context) => {
								const idx = context.dataIndex;
								if (context.datasetIndex === 0) {
									return `ASNs: ${asnCoverage.counts[idx]} (${asnCoverage.percents[idx]}%)`;
								} else {
									return `Countries: ${countryCoverage.counts[idx]} (${countryCoverage.percents[idx]}%)`;
								}
							},
						},
					},
					annotation: {
						annotations: {
							currentMaxLine: {
								type: 'line',
								xMin: sliderPosition - 1,
								xMax: sliderPosition - 1,
								borderColor: 'rgba(255, 99, 71, 0.8)',
								borderWidth: 2,
								borderDash: [6, 6],
								label: {
									display: true,
									content: 'Current',
									position: 'start',
									backgroundColor: 'rgba(255, 99, 71, 0.8)',
								},
							},
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
						ticks: {
							maxTicksLimit: 20,
						},
					},
					y: {
						display: true,
						title: {
							display: true,
							text: 'Coverage %',
						},
						min: 0,
						max: 100,
						ticks: {
							callback: (value) => `${value}%`,
						},
					},
				},
			},
		});
	});

	// Update annotation line when slider moves (without re-rendering full chart)
	$effect(() => {
		if (chart && chart.options.plugins && (chart.options.plugins as any).annotation) {
			const annotation = (chart.options.plugins as any).annotation.annotations?.currentMaxLine;
			if (annotation) {
				annotation.xMin = sliderPosition - 1;
				annotation.xMax = sliderPosition - 1;
				chart.update('none'); // efficient update without animation
			}
		}
	});

	// Full chart update when data changes

	onDestroy(() => {
		if (chart) {
			chart.destroy();
			chart = null;
		}
	});
</script>

<div class="w-full h-96 cursor-pointer">
	<canvas bind:this={canvas}></canvas>
</div>
