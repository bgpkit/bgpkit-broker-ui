<script>
    import "../app.css";
    let { children } = $props();
</script>

<svelte:head>
  <title>BGPKIT Broker Data Status - Latest BGP MRT Files from Route Collectors</title>
  <meta name="description" content="Latest BGP MRT data status for RIPE RIS and RouteViews route collectors: collector file freshness, peer information, MRT file search, and live stream topics.">
  <meta name="keywords" content="BGP, route collector, RIPE RIS, RouteViews, MRT, BGP data, peering, network monitoring">
  <meta name="author" content="BGPKIT">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph / Social Media -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="BGPKIT Broker Data Status - Latest BGP MRT Files from Route Collectors">
  <meta property="og:description" content="Latest BGP MRT data status for RIPE RIS and RouteViews route collectors.">
  <meta property="og:site_name" content="BGPKIT Broker Data Status">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="BGPKIT Broker Data Status">
  <meta name="twitter:description" content="Latest BGP MRT data status for RIPE RIS and RouteViews route collectors.">
  
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
</svelte:head>


<style>
    :global(html) {
      font-family: 'IBM Plex Sans', sans-serif;
    }
    :global(.font-mono), :global(code), :global(pre) {
      font-family: 'IBM Plex Mono', monospace;
    }
</style>

{@render children?.()}

