<script lang="ts">
    import Button, { Label } from '@smui/button';
    import ManageMembers from "./channel-settings/Manage-Members.svelte"
    import Rename from "./channel-settings/Rename.svelte"
    import Delete from "./channel-settings/Delete.svelte"
    import ConfirmDelete from "./Confirm-Delete.svelte"
    import Chat from "./Chat.svelte"

    export let selectedGroup
    export let selectedChannel
    export let chatScreenComponent
    export let groups
    export let deleteType
    deleteType = "CHANNEL"
    
    let confirmDelete = false

</script>

{#if selectedChannel}
    <h2>Edit the settings for the "{selectedChannel.name}" channel.</h2>
    <!-- Rename the channel-->
    <div class:hidden={confirmDelete}>
        <Rename bind:selectedGroup bind:selectedChannel />
    </div>
    <!-- Delete the channel -->
    <div class:hidden={confirmDelete}>
        <Delete bind:confirmDelete />
    </div>
    <!-- Confirm Delete -->
    <div class:hidden={!confirmDelete}>
        <ConfirmDelete bind:selectedGroup bind:selectedChannel bind:confirmDelete bind:chatScreenComponent bind:groups bind:deleteType />
    </div>
    <!-- Manage Members -->
    <div class:hidden={confirmDelete}>
        <ManageMembers bind:selectedChannel bind:selectedGroup />
    </div>
{:else}
    <div>
        <p>No channel selected. Please select a channel to edit.</p>
    </div>
{/if}
<div>
    <Button color="primary" on:click={() => {chatScreenComponent=Chat}} type="button">
        <Label>Back</Label>
    </Button>
</div>        

<style lang="scss">
    div {
		margin-bottom: 1rem;
	}
</style>
