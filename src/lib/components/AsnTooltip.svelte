<script lang="ts">
    import type { AsnInfo } from "../types";

    let {
        asn,
        asnInfo,
        onClick,
    }: {
        asn: number;
        asnInfo: AsnInfo | null | undefined;
        onClick?: (asn: number) => void;
    } = $props();

    function handleClick() {
        if (onClick) {
            onClick(asn);
        }
    }

    // Build tooltip text
    let tooltipText = $derived.by(() => {
        if (!asnInfo) return `AS${asn} - Click to view details`;
        let text = asnInfo.name || `AS${asn}`;
        if (asnInfo.country_name) {
            text += ` - ${asnInfo.country_name}`;
        }
        return text + " - Click to view details";
    });
</script>

<button
    class="cursor-pointer underline decoration-dotted hover:text-primary"
    title={tooltipText}
    onclick={handleClick}
>
    {asn}
</button>
