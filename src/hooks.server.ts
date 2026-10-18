import type { Handle } from "@sveltejs/kit";

// The status page re-renders the full broker dataset on every request. A 60s cache
// keyed by URL absorbs bursts without making the "latest files" panel noticeably
// stale. The cache lives in KV rather than the edge cache on purpose: a response put
// into caches.default is replayed by Cloudflare with the zone's browser TTL
// (max-age=14400 here), which would freeze the page in visitors' browsers for hours.
const TTL_SECONDS = 60;

type CachePlatform = {
  env?: { ASN_CACHE?: KVNamespace };
  context?: { waitUntil?: (promise: Promise<unknown>) => void };
};

export const handle: Handle = async ({ event, resolve }) => {
  if (event.request.method !== "GET" || event.url.pathname !== "/") {
    return resolve(event);
  }

  const platform = event.platform as CachePlatform | undefined;
  const kv = platform?.env?.ASN_CACHE;
  if (!kv) return resolve(event);

  const key = `page:${event.url.pathname}${event.url.search}`;
  const cached = await kv.get(key, { type: "text" });
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-broker-ui-cache": "kv-hit",
      },
    });
  }

  const response = await resolve(event);
  if (
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    return response;
  }

  const body = await response.clone().text();
  const put = kv.put(key, body, { expirationTtl: TTL_SECONDS });
  if (platform?.context?.waitUntil) {
    platform.context.waitUntil(put);
  } else {
    await put;
  }
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-broker-ui-cache": "miss",
    },
  });
};
