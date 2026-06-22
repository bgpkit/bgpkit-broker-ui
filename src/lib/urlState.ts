import { browser } from "$app/environment";

export function setOrDeleteParam(
    url: URL,
    key: string,
    value: string,
    defaultValue: string,
): boolean {
    if (value !== defaultValue) {
        if (url.searchParams.get(key) !== value) {
            url.searchParams.set(key, value);
            return true;
        }
        return false;
    }

    if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        return true;
    }

    return false;
}

export function deleteParams(url: URL, keys: string[]): boolean {
    let changed = false;
    for (const key of keys) {
        if (url.searchParams.has(key)) {
            url.searchParams.delete(key);
            changed = true;
        }
    }
    return changed;
}

export function replaceUrlIfChanged(url: URL, changed: boolean): void {
    if (browser && changed) {
        window.history.replaceState({}, "", url.toString());
    }
}

export function parseUrlBoolean(url: URL, key: string): boolean {
    return url.searchParams.get(key) === "true";
}
