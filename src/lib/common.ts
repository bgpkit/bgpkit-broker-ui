export function fileDelayed(delay: number, data_type: string): boolean {
    return (delay > 60 * 60 && data_type === "updates") || (delay > 60 * 60 * 24 && data_type === "rib")
}
export const DEPRECATED_COLLECTORS = [
    "rrc02",
    "rrc08",
    "rrc09",
    "route-views.jinx",
    "route-views.siex",
    "route-views.saopaulo",
];