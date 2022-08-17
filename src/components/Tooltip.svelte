<script lang="ts">
    import { fade } from 'svelte/transition';

    export let x: Number
    export let y: Number
    export let text: string
    export let hidden: boolean
    export let highlight: boolean
</script>

<div class="tooltip highlight" class:highlight class:hidden style="top: {y}px; left: {x}px;" transition:fade>{text}</div>

<style lang="scss">
    .tooltip {
        position: absolute;
        display: inline;
        margin: 0;
        background: #CDB96A;
        z-index: 1;
        border: solid 1px #999;
        border-radius: 26px;
        color: #000;
        height: 20px;
        min-width: 5rem;
        max-width: 15rem;
        text-overflow: ellipsis;
        padding: 12px 10px 12px 10px;
        cursor: pointer;
        box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2),0px 6px 10px 0px rgba(0, 0, 0, 0.14),0px 1px 18px 0px rgba(0,0,0,.12);
    }
    .tooltip.highlight {
        background: #E58577;
        bottom: 6px;
    }
</style>