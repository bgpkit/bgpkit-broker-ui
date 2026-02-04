# AGENTS.md - Coding Agent Guidelines

This document provides guidelines for AI coding agents working on the BGPKIT Broker Status Page.

## Project Overview

A SvelteKit 2.x web application displaying real-time BGP route collector status and peer information. Built with Svelte 5, TypeScript, Tailwind CSS 4, and DaisyUI 5. Deployed to Cloudflare Pages.

**Live site**: https://status.broker.bgpkit.com

## Build, Lint, and Test Commands

### Development

```bash
# Install dependencies
npm install

# Start development server (hot-reload on http://localhost:5173)
npm run dev
```

### Building

```bash
# Production build (outputs to .svelte-kit/cloudflare/)
npm run build

# Preview production build locally
npm run preview
```

### Type Checking

```bash
# Run TypeScript/Svelte type checking (one-time)
npm run check

# Run type checking in watch mode
npm run check:watch
```

### No Test Framework

This project does not have a test framework configured. There are no unit tests or integration tests.

### No Linting

This project does not have ESLint or Prettier configured. Code formatting should follow the existing style patterns.

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - `strict: true` in tsconfig.json
- Always use TypeScript (`lang="ts"` in Svelte script tags)
- Define interfaces in `src/lib/types.ts` for all data structures
- Use explicit return types for exported functions
- Prefer `type` for unions/aliases, `interface` for object shapes

```typescript
// Good: Explicit types
export function fileDelayed(delay: number, data_type: string): boolean {
  return delay > 60 * 60 && data_type === "updates";
}

// Good: Type definitions in types.ts
export interface BrokerDataEntry {
  collector_id: string;
  data_type: string;
  delay: number;
  // ...
}

// Good: Filter type unions
export type ProjectFilter = "all" | "routeviews" | "riperis";
```

### Svelte 5 Runes

This project uses Svelte 5 runes syntax. Do NOT use Svelte 4 patterns.

```svelte
<script lang="ts">
  // Props - use $props() rune, NOT export let
  let { data, isActive = false }: { data: DataType; isActive?: boolean } = $props();

  // Bindable props
  let { search = $bindable("") }: { search?: string } = $props();

  // Reactive state - use $state(), NOT let with reactive assignment
  let count = $state(0);
  let items = $state<Item[]>([]);

  // Derived values - use $derived(), NOT $: reactive statements
  let doubled = $derived(count * 2);
  let filteredItems = $derived(items.filter(i => i.active));

  // Side effects - use $effect(), NOT $: for side effects
  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

### Imports

- Use `$lib` alias for imports from `src/lib/`
- Use `$app/environment` for SvelteKit environment utilities
- Group imports: framework, then lib, then types

```typescript
// Framework imports
import { browser } from "$app/environment";

// Library imports
import BrokerTable from "$lib/tables/brokerTable.svelte";
import { filterBrokerData, isRipeRis } from "$lib/common";

// Type imports
import type { BrokerData, AsnInfo } from "$lib/types";
```

### File Naming Conventions

- Svelte components: `camelCase.svelte` (e.g., `brokerTable.svelte`, `FilterBar.svelte`)
- TypeScript utilities: `camelCase.ts` (e.g., `common.ts`, `types.ts`)
- SvelteKit routes: `+page.svelte`, `+page.ts`, `+layout.svelte`

### Component Organization

```
src/lib/
  components/     # Reusable UI components (modals, tooltips, filters)
  tables/         # Table display components
  stats/          # Statistics display components
  common.ts       # Utility functions and constants
  types.ts        # TypeScript type definitions
```

### Styling

- Use Tailwind CSS utility classes for all styling
- Use DaisyUI component classes for UI components (btn, input, modal, tabs, etc.)
- No custom CSS files; inline styles discouraged

```svelte
<!-- Good: Tailwind + DaisyUI classes -->
<button class="btn btn-sm btn-primary">Click me</button>
<div class="flex flex-wrap items-center gap-4 mb-4">
  <input type="text" class="input input-bordered w-full" />
</div>
```

### Error Handling

- Use try/catch for async operations (API fetches)
- Log errors with `console.error()` including context
- Return null/empty values on failure; don't throw from utility functions
- Handle loading states in UI components

```typescript
export async function fetchAsnInfo(asn: number): Promise<AsnInfo | null> {
  try {
    const response = await fetch(`https://api.bgpkit.com/v3/utils/asn?asn=${asn}`);
    if (!response.ok) {
      return null;
    }
    const data: AsnApiResponse = await response.json();
    return data.data?.[0] ?? null;
  } catch (error) {
    console.error(`Failed to fetch ASN info for ${asn}:`, error);
    return null;
  }
}
```

### Event Handlers

- Use `onclick`, `oninput`, `onchange` attributes (Svelte 5 style)
- Do NOT use `on:click`, `on:input` directive syntax (Svelte 4)

```svelte
<!-- Good: Svelte 5 event handlers -->
<button onclick={() => handleClick()}>Click</button>
<input oninput={handleSearchInput} />

<!-- Bad: Svelte 4 style -->
<button on:click={handleClick}>Click</button>
```

### Data Flow

- Load data in `+page.ts` using SvelteKit's load function
- Pass data to components via props
- Use `$bindable()` for two-way binding on filter state
- Handle browser-only code with `browser` guard from `$app/environment`

```typescript
// +page.ts
export async function load({ fetch }): Promise<{ brokerData: BrokerData }> {
  const response = await fetch("https://api.bgpkit.com/v3/broker/latest");
  const brokerData: BrokerData = await response.json();
  return { brokerData };
}
```

### URL State Management

- Sync filter state with URL parameters for shareable links
- Use SvelteKit's `replaceState` from `$app/navigation` to update URL without navigation
- Check `browser` before accessing window/document

```typescript
import { replaceState } from "$app/navigation";

$effect(() => {
  if (!browser) return;
  const url = new URL(window.location.href);
  url.searchParams.set("tab", activeTab === 0 ? "collectors" : "peers");
  replaceState(url, {});
});
```

## API Integration

The app fetches from BGPKIT API v3:

- `https://api.bgpkit.com/v3/broker/latest` - Route collector status
- `https://api.bgpkit.com/v3/peers/list` - Collector peers
- `https://api.bgpkit.com/v3/utils/asn?asn={asn}` - ASN info (supports comma-separated)

API documentation: https://api.bgpkit.com/docs

## Key Files

| File | Purpose |
|------|---------|
| `src/routes/+page.svelte` | Main page with tabs |
| `src/routes/+page.ts` | Data loading |
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/common.ts` | Utility functions, filters, sorting |
| `src/lib/components/FilterBar.svelte` | Reusable filter controls |
| `src/lib/tables/brokerTable.svelte` | Collectors table |
| `src/lib/tables/peersTable.svelte` | Peers table |

## Constants

Deprecated collectors are defined in `src/lib/common.ts`:

```typescript
export const DEPRECATED_COLLECTORS = [
  "rrc02", "rrc08", "rrc09",
  "route-views.jinx", "route-views.siex", "route-views.saopaulo"
];
```

## Deployment

Configured for Cloudflare Pages via `@sveltejs/adapter-cloudflare`.
