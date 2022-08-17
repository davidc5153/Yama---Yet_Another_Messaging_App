<script lang="ts">
    import Fab from '@smui/fab';
    import Button, { Label } from '@smui/button';
    import Icon from '@smui/textfield/icon';
    import AddChannel from "./group-settings/Add-Channel.svelte"
    import RemoveMembers from "./group-settings/Remove-Members.svelte"
    import Chat from "./Chat.svelte"
    import InviteMembers from "./group-settings/Invite-Members.svelte"
    import ConfirmDelete from "./Confirm-Delete.svelte"
    export let selectedGroup
    export let chatScreenComponent
    export const deleteType = "GROUP"

    function showAddChannel() {
        chatScreenComponent = AddChannel
    }

    function showManageMembers() {
        chatScreenComponent = RemoveMembers
    }

    function showInviteMembers() {
        chatScreenComponent = InviteMembers
    }

    function showDeleteConfirmation() {
        chatScreenComponent = ConfirmDelete
    }

</script>

{#if selectedGroup}
    <h2>Edit the settings for the "{selectedGroup.name}" group.</h2>
    <div>
        <Button color="primary" variant="raised" on:click={showAddChannel} type="button">
            <Label>Create New Channel</Label>
        </Button>
    </div>
    <div>
        <Button color="primary" variant="raised" on:click={showManageMembers} type="button">
            <Label>Remove Members</Label>
        </Button>
    </div>
    <div>
        <Button color="primary" variant="raised" on:click={showInviteMembers} type="button">
            <Label>Invite New Members</Label>
        </Button>
    </div>
    <div>
        <Button color="primary" variant="raised" on:click={showDeleteConfirmation} style="background: red;" type="button">
            <Icon class="material-icons">dangerous</Icon>
            <Label>Delete Group</Label>
        </Button>    
    </div>
{:else}
    <p>Please select a group to edit.</p>
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
    * :global(button.mdc-button) {
        min-width: 15em;
    }
</style>