import type { AsnInfo, PeersDataEntry } from "./types";
import { isFullFeed, isRipeRis } from "./collectors";

export function calculateGreedyCoverage(
	peersData: PeersDataEntry[],
	asnData: Map<number, AsnInfo>,
	goal: "asns" | "countries",
	ipFamily: "all" | "ipv4" | "ipv6",
	project: "any" | "rv" | "ris" | "balanced" = "any",
	maxCollectors: number = 10,
): {
	selectedCollectors: string[];
	totalCoverage: number;
	coverageByStep: {
		collector: string;
		newCoverage: number;
		cumulativeCoverage: number;
	}[];
	collectorDetails: Map<
		string,
		{
			peers: PeersDataEntry[];
			fullFeedPeers: PeersDataEntry[];
			uniqueAsns: Set<number>;
			uniqueCountries: Set<string>;
		}
	>;
	availableCollectorsCount: number;
} {
	// Filter peers by IP family and project (same logic as chart and stats)
	const filteredPeers = peersData.filter((peer) => {
		// IP family filter
		if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
		if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
		// Project filter (for non-balanced modes)
		if (project === "rv" && isRipeRis(peer.collector)) return false;
		if (project === "ris" && !isRipeRis(peer.collector)) return false;
		return true;
	});

	// Group peers by collector
	const collectorPeers = new Map<string, PeersDataEntry[]>();
	for (const peer of filteredPeers) {
		const existing = collectorPeers.get(peer.collector) || [];
		existing.push(peer);
		collectorPeers.set(peer.collector, existing);
	}

	const availableCollectorsCount = collectorPeers.size;

	// Calculate coverage for each collector (only full-feed peers)
	const collectorDetails = new Map<
		string,
		{
			peers: PeersDataEntry[];
			fullFeedPeers: PeersDataEntry[];
			uniqueAsns: Set<number>;
			uniqueCountries: Set<string>;
		}
	>();

	for (const [collector, peers] of collectorPeers) {
		const fullFeedPeers = peers.filter(isFullFeed);
		const uniqueAsns = new Set(fullFeedPeers.map((p) => p.asn));
		const uniqueCountries = new Set<string>();

		for (const peer of fullFeedPeers) {
			const info = asnData.get(peer.asn);
			if (info?.country) {
				uniqueCountries.add(info.country);
			}
		}

		collectorDetails.set(collector, {
			peers,
			fullFeedPeers,
			uniqueAsns,
			uniqueCountries,
		});
	}

	// Greedy selection
	const selectedCollectors: string[] = [];
	const coveredItems = new Set<string | number>();
	const coverageByStep: {
		collector: string;
		newCoverage: number;
		cumulativeCoverage: number;
	}[] = [];

	// Track counts for balanced mode
	let rvCount = 0;
	let risCount = 0;

	while (selectedCollectors.length < maxCollectors) {
		let bestCollector: string | null = null;
		let bestNewCoverage = 0;
		let bestItems: Set<string | number> = new Set();
		let bestIsRis = false;

		for (const [collector, details] of collectorDetails) {
			if (selectedCollectors.includes(collector)) continue;

			const isRisCollector = isRipeRis(collector);

			// For balanced mode, enforce 50/50 split
			if (project === "balanced") {
				const targetRv = Math.ceil(maxCollectors / 2);
				const targetRis = Math.floor(maxCollectors / 2);

				if (isRisCollector && risCount >= targetRis) continue;
				if (!isRisCollector && rvCount >= targetRv) continue;
			}

			const items =
				goal === "asns" ? details.uniqueAsns : details.uniqueCountries;
			const newItems = new Set<string | number>();

			for (const item of items) {
				if (!coveredItems.has(item)) {
					newItems.add(item);
				}
			}

			if (newItems.size > bestNewCoverage) {
				bestNewCoverage = newItems.size;
				bestCollector = collector;
				bestItems = newItems;
				bestIsRis = isRisCollector;
			}
		}

		if (bestCollector === null || bestNewCoverage === 0) {
			break;
		}

		selectedCollectors.push(bestCollector);
		for (const item of bestItems) {
			coveredItems.add(item);
		}

		if (bestIsRis) {
			risCount++;
		} else {
			rvCount++;
		}

		coverageByStep.push({
			collector: bestCollector,
			newCoverage: bestNewCoverage,
			cumulativeCoverage: coveredItems.size,
		});
	}

	return {
		selectedCollectors,
		totalCoverage: coveredItems.size,
		coverageByStep,
		collectorDetails,
		availableCollectorsCount,
	};
}

// Calculate coverage curve data for chart visualization
// Runs the greedy algorithm twice: once optimizing for ASNs, once for countries
export function calculateCoverageCurve(
	peersData: PeersDataEntry[],
	asnInfoMap: Map<number, AsnInfo>,
	ipFamily: "all" | "ipv4" | "ipv6",
	project: "any" | "rv" | "ris" | "balanced" = "any",
	maxCollectors: number = 81,
): {
	labels: number[];
	asnCoverage: { counts: number[]; percents: number[] };
	countryCoverage: { counts: number[]; percents: number[] };
} {
	// Calculate baseline totals from ALL collectors (ignoring project filter)
	// Use ASNs with at least one full-feed peer for percentage calculation
	const baselinePeers = peersData.filter((peer) => {
		if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
		if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
		return true;
	});

	const baselineFullFeedPeers = baselinePeers.filter(isFullFeed);
	const baselineAsns = new Set(baselineFullFeedPeers.map((p) => p.asn));
	const baselineCountries = new Set<string>();

	for (const peer of baselineFullFeedPeers) {
		const info = asnInfoMap.get(peer.asn);
		if (info?.country) {
			baselineCountries.add(info.country);
		}
	}

	const totalBaselineAsns = baselineAsns.size;
	const totalBaselineCountries = baselineCountries.size;

	// Filter peers by IP family and project (same logic as greedy algorithm)
	const filteredPeers = peersData.filter((peer) => {
		if (ipFamily === "ipv4" && peer.num_v4_pfxs === 0) return false;
		if (ipFamily === "ipv6" && peer.num_v6_pfxs === 0) return false;
		if (project === "rv" && isRipeRis(peer.collector)) return false;
		if (project === "ris" && !isRipeRis(peer.collector)) return false;
		return true;
	});

	// Get available collectors (same logic as greedy algorithm)
	const availableCollectors = new Set(filteredPeers.map((p) => p.collector));
	const totalAvailableCollectors = availableCollectors.size;

	const labels: number[] = [];
	const asnCounts: number[] = [];
	const asnPercents: number[] = [];
	const countryCounts: number[] = [];
	const countryPercents: number[] = [];

	for (let i = 1; i <= maxCollectors; i++) {
		const effectiveMax = Math.min(i, totalAvailableCollectors);

		// Run greedy algorithm optimized for ASNs
		const asnResult = calculateGreedyCoverage(
			peersData,
			asnInfoMap,
			"asns",
			ipFamily,
			project,
			effectiveMax,
		);

		// Run greedy algorithm optimized for countries
		const countryResult = calculateGreedyCoverage(
			peersData,
			asnInfoMap,
			"countries",
			ipFamily,
			project,
			effectiveMax,
		);

		// Count unique ASNs from ASN-optimized selection
		const selectedAsns = new Set<number>();
		for (const collector of asnResult.selectedCollectors) {
			const details = asnResult.collectorDetails.get(collector);
			if (details) {
				for (const asn of details.uniqueAsns) {
					selectedAsns.add(asn);
				}
			}
		}

		// Count unique countries from country-optimized selection
		const selectedCountries = new Set<string>();
		for (const collector of countryResult.selectedCollectors) {
			const details = countryResult.collectorDetails.get(collector);
			if (details) {
				for (const country of details.uniqueCountries) {
					selectedCountries.add(country);
				}
			}
		}

		labels.push(i);
		asnCounts.push(selectedAsns.size);
		asnPercents.push(totalBaselineAsns > 0 ? Math.round((selectedAsns.size / totalBaselineAsns) * 100) : 0);
		countryCounts.push(selectedCountries.size);
		countryPercents.push(totalBaselineCountries > 0 ? Math.round((selectedCountries.size / totalBaselineCountries) * 100) : 0);
	}

	return {
		labels,
		asnCoverage: { counts: asnCounts, percents: asnPercents },
		countryCoverage: { counts: countryCounts, percents: countryPercents },
	};
}
