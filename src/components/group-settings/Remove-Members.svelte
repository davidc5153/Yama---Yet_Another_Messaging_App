<script lang="ts">

    import Button, { Icon, Label } from '@smui/button';

    import EditExistingMembers from "./Edit-Existing-Members.svelte"
    import Chat from "./../Chat.svelte"
    import InviteMembers from "./Invite-Members.svelte"
    import ApiRequest from "../../lib/api";
    import { onMount } from 'svelte';
    import GroupSettings from "../Group-Settings.svelte";
    import { STORE_newAlert } from '../../stores';


    export let chatScreenComponent
    export let selectedGroup
    export let selectedChannel

    let settingsShowing = true

    onMount(async () => {
        try {
    		selectedGroup.members = await ApiRequest.groupGetMembers(selectedGroup._id)
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Group members error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
	});

</script>

<div id="group-settings" class="setting" class:showing={settingsShowing}>

    <div>
        <EditExistingMembers bind:selectedGroup bind:selectedChannel />
    </div>
    <div>
        <Button color="primary" variant="raised" on:click={()=>{chatScreenComponent=InviteMembers}} type="button">
            <Label>Invite new member</Label>
        </Button>                        
    </div>
    	<Button color="primary" on:click={() => {chatScreenComponent=GroupSettings}} type="button">
            <Label>Back</Label>
    	</Button>
</div>

<style lang="scss">
	div {
		margin-bottom: 1rem;
	} 
    .setting {
        display: none;
    }
    .showing {
        display: block;
    }
</style>
