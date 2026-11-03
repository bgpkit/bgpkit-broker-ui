<script lang="ts">
    /**
     * Archive coverage: one row per year, one cell per week, coloured by how much of that week's
     * archive Spectrum has parsed.
     *
     * The API answers parallel arrays for a dense daily series, so a week's numbers are a slice of
     * the arrays and the date of day N is `start + N days`. Nothing here re-derives the calendar
     * from anything else: if the series ever stops being dense, the API has to change first.
     *
     * Two counts matter and only one is visible at a glance: the colour is the file ratio, and the
     * tooltip carries the collector ratio, which is where a single missing IXP shows up as 22 of 23
     * while the file ratio still reads 99%.
     */
    const API = "https://api.bgpkit.com/v4/mrt/coverage";

    interface Coverage {
        scope: "fleet" | "collector";
        project: string;
        collector: string | null;
        start: string | null;
        interval: "day";
        files_expected: number[];
        files_done: number[];
        collectors_expected: number[] | null;
        collectors_done: number[] | null;
        meta: { source: string; days: number; refreshed_at: string | null };
    }

    type Project = "ripe-ris" | "route-views";

    let project = $state<Project>("ripe-ris");
    let data = $state<Coverage | null>(null);
    let error = $state<string | null>(null);
    let loading = $state(true);
    let hovered = $state<string | null>(null);

    $effect(() => {
        const wanted = project;
        loading = true;
        error = null;
        void fetch(`${API}?project=${wanted}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`coverage request failed: ${response.status}`);
                }
                return response.json() as Promise<Coverage>;
            })
            .then((payload) => {
                if (project === wanted) {
                    data = payload;
                }
            })
            .catch((cause: unknown) => {
                if (project === wanted) {
                    error = cause instanceof Error ? cause.message : String(cause);
                }
            })
            .finally(() => {
                if (project === wanted) {
                    loading = false;
                }
            });
    });

    const DAY_MS = 86_400_000;

    interface WeekCell {
        year: number;
        week: number;
        startDay: number;
        endDay: number;
        expected: number;
        done: number;
        collectorsExpected: number;
        collectorsDone: number;
    }

    interface YearRow {
        year: number;
        weeks: (WeekCell | null)[];
    }

    function buildGrid(payload: Coverage): YearRow[] {
        if (!payload.start) {
            return [];
        }
        const startMs = Date.parse(`${payload.start}T00:00:00Z`);
        const perYear = new Map<number, Map<number, WeekCell>>();

        for (let index = 0; index < payload.files_expected.length; index += 1) {
            const expected = payload.files_expected[index] ?? 0;
            const date = new Date(startMs + index * DAY_MS);
            const year = date.getUTCFullYear();
            const dayOfYear = Math.floor((date.getTime() - Date.UTC(year, 0, 1)) / DAY_MS);
            const week = Math.floor(dayOfYear / 7);

            let weeks = perYear.get(year);
            if (!weeks) {
                weeks = new Map();
                perYear.set(year, weeks);
            }
            let cell = weeks.get(week);
            if (!cell) {
                cell = {
                    year,
                    week,
                    startDay: index,
                    endDay: index,
                    expected: 0,
                    done: 0,
                    collectorsExpected: 0,
                    collectorsDone: 0,
                };
                weeks.set(week, cell);
            }
            cell.endDay = index;
            cell.expected += expected;
            cell.done += payload.files_done[index] ?? 0;
            if (payload.collectors_expected && payload.collectors_done) {
                cell.collectorsExpected = Math.max(
                    cell.collectorsExpected,
                    payload.collectors_expected[index] ?? 0,
                );
                cell.collectorsDone = Math.max(
                    cell.collectorsDone,
                    payload.collectors_done[index] ?? 0,
                );
            }
        }

        const years = [...perYear.keys()].sort((a, b) => a - b);
        return years.map((year) => {
            const weeks = perYear.get(year)!;
            const row: (WeekCell | null)[] = new Array(53).fill(null);
            for (const [week, cell] of weeks) {
                if (week >= 0 && week < 53) {
                    row[week] = cell;
                }
            }
            return { year, weeks: row };
        });
    }

    /** Five buckets: nothing, under half, most, nearly all, all. Grey means no files that week. */
    function shade(cell: WeekCell | null): string {
        if (!cell || cell.expected === 0) {
            return "bg-base-300/50";
        }
        const ratio = cell.done / cell.expected;
        if (ratio <= 0) return "bg-emerald-100 dark:bg-emerald-950";
        if (ratio < 0.5) return "bg-emerald-300 dark:bg-emerald-800";
        if (ratio < 0.9) return "bg-emerald-500 dark:bg-emerald-600";
        if (ratio < 1) return "bg-emerald-600 dark:bg-emerald-400";
        return "bg-emerald-700 dark:bg-emerald-300";
    }

    function tooltip(cell: WeekCell | null): string {
        if (!cell) {
            return "no data";
        }
        if (cell.expected === 0) {
            return `week ${cell.week + 1}, ${cell.year}: no files`;
        }
        const percent = ((cell.done / cell.expected) * 100).toFixed(1);
        return (
            `week ${cell.week + 1}, ${cell.year}: ${percent}% of files parsed ` +
            `(${cell.done.toLocaleString()} / ${cell.expected.toLocaleString()}), ` +
            `${cell.collectorsDone}/${cell.collectorsExpected} collectors complete`
        );
    }

    let grid = $derived(data ? buildGrid(data) : []);

    let totals = $derived.by(() => {
        if (!data) {
            return { expected: 0, done: 0, percent: "0.0", days: 0 };
        }
        const expected = data.files_expected.reduce((sum, value) => sum + value, 0);
        const done = data.files_done.reduce((sum, value) => sum + value, 0);
        return {
            expected,
            done,
            percent: expected === 0 ? "0.0" : ((done / expected) * 100).toFixed(1),
            days: data.meta.days,
        };
    });
</script>

<section class="rounded-lg border border-base-300 bg-base-100 p-4">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
            <h2 class="text-sm font-semibold">Archive coverage</h2>
            <p class="text-xs text-base-content/60">
                {totals.percent}% of {totals.expected.toLocaleString()} files parsed over
                {totals.days.toLocaleString()} days
            </p>
            <p class="text-[10px] text-base-content/45">
                one row per year, one cell per week, weeks left to right. The backfill works
                backwards from 2026, so dark cells spread from the newest week towards 1999.
            </p>
        </div>
        <div class="join">
            {#each ["ripe-ris", "route-views"] as const as option}
                <button
                    type="button"
                    class="btn join-item btn-xs {project === option ? 'btn-active' : ''}"
                    onclick={() => (project = option)}
                >
                    {option}
                </button>
            {/each}
        </div>
    </div>

    {#if error}
        <p class="text-xs text-error">coverage unavailable: {error}</p>
    {:else if loading && !data}
        <span class="loading loading-dots loading-md"></span>
    {:else}
        <div class="w-full">
            <div class="w-full space-y-[2px]">
                {#each grid as row (row.year)}
                    <div class="grid grid-cols-[2.5rem_1fr] items-center gap-2">
                        <span class="text-right font-mono text-[10px] text-base-content/50"
                            >{row.year}</span
                        >
                        <div
                            class="grid gap-[2px]"
                            style="grid-template-columns: repeat(53, minmax(0, 1fr));"
                        >
                            {#each row.weeks as cell}
                                <div
                                    class="aspect-square w-full rounded-[2px] {shade(cell)}"
                                    title={tooltip(cell)}
                                    onmouseenter={() => (hovered = tooltip(cell))}
                                    role="presentation"
                                ></div>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-base-content/60">
            <span class="flex items-center gap-1">
                <span class="h-[9px] w-[9px] rounded-[1px] bg-base-300/50"></span> no files
            </span>
            <span class="flex items-center gap-1">
                <span class="h-[9px] w-[9px] rounded-[1px] bg-emerald-100 dark:bg-emerald-950"></span> none parsed
            </span>
            <span class="flex items-center gap-1">
                <span class="h-[9px] w-[9px] rounded-[1px] bg-emerald-300 dark:bg-emerald-800"></span> &lt;50%
            </span>
            <span class="flex items-center gap-1">
                <span class="h-[9px] w-[9px] rounded-[1px] bg-emerald-500 dark:bg-emerald-600"></span> &lt;90%
            </span>
            <span class="flex items-center gap-1">
                <span class="h-[9px] w-[9px] rounded-[1px] bg-emerald-600 dark:bg-emerald-400"></span> &lt;100%
            </span>
            <span class="flex items-center gap-1">
                <span class="h-[9px] w-[9px] rounded-[1px] bg-emerald-700 dark:bg-emerald-300"></span> complete
            </span>
            {#if hovered}
                <span class="text-base-content/80">{hovered}</span>
            {/if}
        </div>
    {/if}
</section>
