<script>
    import "../app.css";
    let { children } = $props();
</script>

<svelte:head>
  <title>BGPKIT Broker Status - BGP Route Collector Monitoring</title>
  <meta name="description" content="Real-time monitoring of BGP route collectors including RIPE RIS and RouteViews. View collector status, peer information, and coverage optimization tools.">
  <meta name="keywords" content="BGP, route collector, RIPE RIS, RouteViews, peering, network monitoring, BGP data">
  <meta name="author" content="BGPKIT">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph / Social Media -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="BGPKIT Broker Status - BGP Route Collector Monitoring">
  <meta property="og:description" content="Real-time monitoring of BGP route collectors including RIPE RIS and RouteViews.">
  <meta property="og:site_name" content="BGPKIT Broker Status">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="BGPKIT Broker Status">
  <meta name="twitter:description" content="Real-time monitoring of BGP route collectors including RIPE RIS and RouteViews.">
  
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap" rel="stylesheet">
</svelte:head>


<style>
    :global(html) {
      font-family: 'Roboto', sans-serif;
    }
</style>

{@render children?.()}

