<script lang="ts">
    import CircularProgress from '@smui/circular-progress';
    export let selectedGroup
</script>

{#if selectedGroup && selectedGroup.friend}
    <CircularProgress style="height: 32px; width: 32px;" indeterminate />
{:else}
    <p>Select a friend to start chatting.</p>
{/if}