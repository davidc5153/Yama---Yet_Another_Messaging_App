<script lang="ts">
    import Fab from "@smui/fab";
    export let object;
    export let selectedClass:string
</script>

<Fab mini class="avatar group {selectedClass}" on:click >
    <strong>
        {#if object && object.name && object.name.length>0 }
            {object.name.charAt(0).toUpperCase()}
        {:else}
            &nbsp;
        {/if}
    </strong>
</Fab>
