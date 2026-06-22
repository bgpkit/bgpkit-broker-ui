import { describe, expect, it } from "vitest";
import {
    filterBrokerData,
    getCollectorStatus,
    isFullFeed,
    sortCollectors,
    formatDurationAgo,
} from "./common";
import type { BrokerDataEntry, PeersDataEntry } from "./types";

const brokerEntry = (collector_id: string, delay: number, data_type: "rib" | "updates"): BrokerDataEntry => ({
    collector_id,
    data_type,
    delay,
    rough_size: 0,
    exact_size: 0,
    collector_url: "",
    ts_start: "2026-01-01T00:00:00",
    ts_end: "2026-01-01T00:00:00",
    url: "",
});

const peerEntry = (num_v4_pfxs: number, num_v6_pfxs: number): PeersDataEntry => ({
    date: "2026-01-01",
    collector: "rrc00",
    ip: "192.0.2.1",
    asn: 64496,
    num_v4_pfxs,
    num_v6_pfxs,
    num_connected_asns: 1,
});

describe("collector status helpers", () => {
    it("marks configured collectors as decommissioned", () => {
        expect(getCollectorStatus("route-views.chile", 0, "updates")).toBe("decommissioned");
    });

    it("marks delayed update files", () => {
        expect(getCollectorStatus("rrc00", 7200, "updates")).toBe("delayed");
    });

    it("sorts RIPE RIS collectors before RouteViews collectors", () => {
        expect(["route-views.eqix", "rrc00"].sort(sortCollectors)).toEqual(["rrc00", "route-views.eqix"]);
    });
});

describe("broker filtering", () => {
    const entries = [
        brokerEntry("rrc00", 0, "updates"),
        brokerEntry("rrc01", 7200, "updates"),
        brokerEntry("route-views.chile", 0, "updates"),
    ];

    it("hides decommissioned collectors by default", () => {
        expect(filterBrokerData(entries, "", "all", "all", "all").map((entry) => entry.collector_id)).toEqual([
            "rrc00",
            "rrc01",
        ]);
    });

    it("includes decommissioned collectors when requested", () => {
        expect(filterBrokerData(entries, "", "all", "all", "all", true)).toHaveLength(3);
    });

    it("filters delayed entries", () => {
        expect(filterBrokerData(entries, "", "all", "all", "delayed").map((entry) => entry.collector_id)).toEqual([
            "rrc01",
        ]);
    });
});

describe("full-feed and formatting helpers", () => {
    it("detects full-feed peers", () => {
        expect(isFullFeed(peerEntry(800_000, 0))).toBe(true);
        expect(isFullFeed(peerEntry(100, 100))).toBe(false);
    });

    it("formats relative durations", () => {
        expect(formatDurationAgo(3600)).toBe("an hour ago");
    });
});
