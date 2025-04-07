# BGPKIT Broker Status Page

This repository contains the front-end code for BGPKIT Broker database status for the collectors and peers.

The current deployment is available at <https://status.broker.bgpkit.com>.

## Project Overview

The BGPKIT Broker Status Page is a web application built with SvelteKit that provides real-time information about BGP route collectors and their peers. The application displays data regarding collector status, file availability, sizes, peers connectivity, and more.

## Features

- **Route Collectors Dashboard**: Displays a table of all BGP route collectors, showing:
    - Collector ID with links to data sources
    - Data type
    - Status (active, delayed, or deprecated)
    - File timestamps and update times
    - File sizes
    - Status indicators for latest data

- **Collector Peers Dashboard**: Shows information about all peers connected to collectors:
    - Collector ID
    - Peer IP addresses
    - ASN information
    - IPv4 and IPv6 prefix counts
    - Connected ASN counts
    - Full-feed status indicators

- **Statistics Panels**: Provides quick overview metrics for:
    - Collector statistics
    - On-time updates statistics
    - Peer connectivity metrics

## API Integration

The application fetches data from two main BGPKIT API endpoints:
- `https://api.bgpkit.com/v3/broker/latest` - For route collector status
- `https://api.bgpkit.com/v3/peers/list` - For information about collector peers

## Project Structure

- `src/routes/`
    - `+page.svelte` - Main page layout with tabbed interface
    - `+page.ts` - Data loading logic
    - `+layout.svelte` - App layout and global styles

- `src/lib/`
    - `tables/`
        - `brokerTable.svelte` - Table component for collector data
        - `peersTable.svelte` - Table component for peer data
    - `stats/`
        - `collectorStats.svelte` - Statistics about collectors
        - `onTimeStats.svelte` - Statistics about on-time data
        - `peersStats.svelte` - Statistics about peers
    - `common.js` - Common utilities and constants
    - `types.ts` - TypeScript type definitions

## Getting Started

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Deployment

The application can be deployed to Cloudflare Pages or any other hosting service that supports SvelteKit applications.