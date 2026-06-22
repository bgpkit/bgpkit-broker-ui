export function formatDuration(seconds: number): string {
    const absSeconds = Math.max(0, Math.round(seconds));

    if (absSeconds < 45) return "a few seconds";
    if (absSeconds < 90) return "a minute";

    const minutes = Math.round(absSeconds / 60);
    if (minutes < 45) return `${minutes} minutes`;
    if (minutes < 90) return "an hour";

    const hours = Math.round(minutes / 60);
    if (hours < 22) return `${hours} hours`;
    if (hours < 36) return "a day";

    const days = Math.round(hours / 24);
    if (days < 26) return `${days} days`;
    if (days < 45) return "a month";

    const months = Math.round(days / 30);
    if (days < 320) return `${months} months`;
    if (days < 548) return "a year";

    const years = Math.round(days / 365);
    return `${years} years`;
}

export function formatDurationAgo(seconds: number): string {
    return `${formatDuration(seconds)} ago`;
}
