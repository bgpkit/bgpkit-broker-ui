import type { Handle } from "@sveltejs/kit";

// The collector status page moved to https://broker.bgpkit.com, served by the
// bgp-fyi-atlas worker. This worker stays deployed only to answer the two legacy
// hostnames, so every request is a permanent redirect to the live page.
//
// The redirect keeps the path and query, because a bookmarked URL such as
// /?tab=peers should not lose where it pointed; the new page ignores the parts it
// does not understand.
//
// The 301 carries a five-minute browser cache on purpose. The rollback for this
// change is one deploy, and an unexpiring 301 in visitors' browsers would outlive
// the rollback: five minutes lets a mistake heal on its own while still telling
// crawlers the move is permanent.
const CANONICAL = "https://broker.bgpkit.com";
const REDIRECT_TTL_SECONDS = 300;

export const handle: Handle = async ({ event }) => {
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
