<script lang="ts">
    import type { BrokerHealthData } from "$lib/types";
    import { formatDurationAgo } from "$lib/format";

    let { healthData }: { healthData: BrokerHealthData | null } = $props();

    const healthy = $derived(healthData?.status?.toUpperCase() === "OK");
    const sseHealthy = $derived(healthData?.sse?.status === "healthy");
</script>

<div class="rounded-lg border border-base-300 bg-base-100 p-4">
    <div
        class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-base-content/55"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-3.5 w-3.5"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
        </svg>
        Broker Health
    </div>
    {#if healthData}
        <div
            class="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight {healthy
                ? 'text-success'
                : 'text-error'}"
        >
            {healthData.status}
        </div>
        <div class="mt-1 text-xs text-base-content/55">
            {healthData.backend}{healthData.fail_over ? " (failover)" : ""} · latest
            file {formatDurationAgo(healthData.meta.delay_secs)}
        </div>
        {#if healthData.sse}
            <div
                class="mt-1 flex items-center gap-1.5 text-xs {sseHealthy
                    ? 'text-success'
                    : 'text-warning'}"
            >
                <span class="status status-sm {sseHealthy ? 'status-success' : 'status-warning'}"></span>
                SSE {healthData.sse.status} ({healthData.sse.response_time_ms}ms)
            </div>
        {/if}
    {:else}
        <div class="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight text-warning">
            Unknown
        </div>
        <div class="mt-1 text-xs text-base-content/55">Health endpoint unavailable</div>
    {/if}
</div>
