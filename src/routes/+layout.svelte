<script>
    import "../app.css";
    let { children } = $props();
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap" rel="stylesheet">
</svelte:head>


<style>
    :global(html) {
      font-family: 'Roboto', sans-serif;
    }
</style>

{@render children?.()}

