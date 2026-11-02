import type { Handle } from "@sveltejs/kit";

// The collector status page lives at https://broker.bgpkit.com, and this worker serves it. The
// two legacy hostnames stay attached only to answer with a permanent redirect, so a request on
// the canonical host must pass straight through or the redirect would point at itself.
//
// The redirect keeps the path and query, because a bookmarked URL such as /?tab=peers should not
// lose where it pointed; the page ignores the parts it does not understand.
//
// The 301 carries a five-minute browser cache on purpose. The rollback for a bad cutover is one
// deploy, and an unexpiring 301 in visitors' browsers would outlive it: five minutes lets a
// mistake heal on its own while still telling crawlers the move is permanent.
const CANONICAL = "https://broker.bgpkit.com";
const REDIRECT_TTL_SECONDS = 300;
const LEGACY_HOSTS = new Set(["status.broker.bgpkit.com", "ui.broker.bgpkit.com"]);

export const handle: Handle = async ({ event, resolve }) => {
  if (!LEGACY_HOSTS.has(event.url.hostname)) {
    return resolve(event);
  }

  const target = new URL(CANONICAL);
  target.pathname = event.url.pathname;
  target.search = event.url.search;

  return new Response(null, {
    status: 301,
    headers: {
      location: target.toString(),
      "cache-control": `public, max-age=${REDIRECT_TTL_SECONDS}`,
    },
  });
};
