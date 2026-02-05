import { browser } from "$app/environment";

export interface UrlSyncConfig {
    params: Record<string, { value: string; default: string }>;
    tabParam?: string;
}

export function createUrlSyncEffect(
    config: UrlSyncConfig,
    getParams: () => Record<string, string>,
): () => void {
    if (!browser) {
        return () => {};
    }

    const url = new URL(window.location.href);
    let initialized = false;

    const syncToUrl = () => {
        const currentParams = getParams();
        let changed = false;

        for (const [key, { value, default: defaultVal }] of Object.entries(config.params)) {
            const currentValue = currentParams[key] ?? defaultVal;
            const urlValue = url.searchParams.get(key);

            if (currentValue !== defaultVal) {
                if (urlValue !== currentValue) {
                    url.searchParams.set(key, currentValue);
                    changed = true;
                }
            } else if (urlValue !== null) {
                url.searchParams.delete(key);
                changed = true;
            }
        }

        if (config.tabParam && url.searchParams.get("tab") !== config.tabParam) {
            url.searchParams.set("tab", config.tabParam);
            changed = true;
        }

        if (changed) {
            window.history.replaceState({}, "", url.toString());
        }
    };

    const cleanup = () => {
        syncToUrl();
    };

    return cleanup;
}

export function parseUrlParams(
    url: URL,
    params: Record<string, { type: "string" | "number" | "boolean"; default: string | number | boolean }>,
): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};

    for (const [key, { type, default: defaultVal }] of Object.entries(params)) {
        const value = url.searchParams.get(key);
        if (value !== null) {
            switch (type) {
                case "number":
                    result[key] = parseInt(value, 10) || (defaultVal as number);
                    break;
                case "boolean":
                    result[key] = value === "true";
                    break;
                default:
                    result[key] = value;
            }
        } else {
            result[key] = defaultVal;
        }
    }

    return result;
}

export function buildUrlWithParams(
    baseUrl: URL,
    params: Record<string, string | number | boolean>,
    defaults: Record<string, string | number | boolean>,
): URL {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(params)) {
        if (value !== defaults[key]) {
            url.searchParams.set(key, String(value));
        } else {
            url.searchParams.delete(key);
        }
    }

    return url;
}
