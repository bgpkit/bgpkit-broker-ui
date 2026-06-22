<script lang="ts">
    import type { BrokerHealthData } from "$lib/types";
    import { formatDurationAgo } from "$lib/format";

    let { healthData }: { healthData: BrokerHealthData | null } = $props();

    const healthy = $derived(healthData?.status?.toUpperCase() === "OK");
    const sseHealthy = $derived(healthData?.sse?.status === "healthy");
</script>

<div class="stat bg-base-200 rounded-lg p-4 shadow">
    <div class="stat-title">Broker Health</div>
    {#if healthData}
        <div class="stat-value text-2xl {healthy ? 'text-success' : 'text-error'}">
            {healthData.status}
        </div>
        <div class="stat-desc">
            {healthData.backend}{healthData.fail_over ? " failover" : ""} • latest file {formatDurationAgo(healthData.meta.delay_secs)}
        </div>
        {#if healthData.sse}
            <div class="text-xs mt-1 {sseHealthy ? 'text-success' : 'text-warning'}">
                SSE {healthData.sse.status} ({healthData.sse.response_time_ms}ms)
            </div>
        {/if}
    {:else}
        <div class="stat-value text-2xl text-warning">Unknown</div>
        <div class="stat-desc">Health endpoint unavailable</div>
    {/if}
</div>
