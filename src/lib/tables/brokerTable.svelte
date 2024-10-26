<script lang="ts">
    import filesize from "file-size";
    import pkg from "moment/moment";
    const { duration } = pkg;
    import type { BrokerData, BrokerDataEntry } from "../types";
    import { DEPRECATED_COLLECTORS, fileDelayed } from "../common";

    const { brokerData }: { brokerData: BrokerData } = $props();
    const entries: BrokerDataEntry[] = $derived(brokerData.data);

    $effect(() => {
        entries.sort((a, b) => a.url.localeCompare(b.url));
    });

    function extractCollectorUrl(inputString: string) {
        if (!inputString) return ""; // Return empty string if input is undefined or null

        // Regular expression to match the pattern 'xxxx.xx' where x is a digit
        const pattern = /\d{4}\.\d{2}/;

        // Find the index of the pattern in the input string
        const matchIndex = inputString.search(pattern);

        // If the pattern is found, delete everything after it, else return the original string
        return matchIndex >= 0 ? inputString.slice(0, matchIndex) : inputString;
    }

    const CHECKMARK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="green" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg>`;
    const WARNING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="red" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /> </svg>`;
    const TRASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="gray" class="w-6 h-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /> </svg> `;
</script>

{#if brokerData == undefined}
    <span class="loading loading-dots loading-lg"></span>
{:else}
    <div class="overflow-x-auto">
        <table class="table table-zebra">
            <!-- head -->
            <thead>
                <tr>
                    <th>Collector ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>File Time UTC</th>
                    <th>Last Updated At</th>
                    <th>Size</th>
                    <th>Latest</th>
                </tr>
            </thead>
            <tbody>
                {#each entries as { collector_id, data_type, delay, rough_size, ts_start, url }}
                    <tr>
                        <td>
                            <a
                                class="link"
                                href={extractCollectorUrl(url)}
                                target="_blank"
                            >
                                {collector_id}
                            </a>
                        </td>
                        <td>{data_type}</td>
                        <td>
                            {#if DEPRECATED_COLLECTORS.includes(collector_id)}
                                {@html TRASH_ICON}
                            {:else if fileDelayed(delay, data_type)}
                                {@html WARNING_ICON}
                            {:else}
                                {@html CHECKMARK_ICON}
                            {/if}
                        </td>
                        <td>{ts_start.replace("T", " ")}</td>
                        <td>{duration(delay, "seconds").humanize()} ago</td>
                        <td>{filesize(rough_size).human("si")}</td>
                        <td>
                            <a
                                href={url}
                                target="_blank"
                                class="link link-primary">Download</a
                            >
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}
