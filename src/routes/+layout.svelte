<script lang='ts'>
	// Most of your app wide CSS should be put in this file
	import '../app.postcss';
    import { AppShell } from '@skeletonlabs/skeleton';
</script>

<AppShell slotSidebarLeft="bg-gray-100">
    <slot />
</AppShell>
