export interface BrokerDataEntry {
    collector_id: string;
    data_type: string;
    rough_size: number;
    exact_size: number;
    delay: number;
    collector_url: string;
    ts_start: string;
    ts_end: string;
    url: string;
}

export interface BrokerData {
    count: number;
    data: BrokerDataEntry[];
    meta: {
        backend: string;
        latest_update_ts: string;
        latest_update_duration: number;
    };
}
