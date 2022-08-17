<script lang="ts">

    import Textfield, { Input } from '@smui/textfield';
    import Icon from '@smui/textfield/icon';
    import FormField from '@smui/form-field';
    import Button, { Label } from '@smui/button';
    import { onMount } from 'svelte';	    
    import ApiRequest from "./../../lib/api"
    import { existingChannelName, MINIMUM_CHANNEL_NAME_LENGTH, validateChannelName } from "../../lib/validate";
    import Chat from "./../Chat.svelte"
    import GroupSettings from "../Group-Settings.svelte";
    import ClearField from '../Clear-Field.svelte';
    import List, { Item, Meta, Text, Graphic, PrimaryText } from '@smui/list';	
    import Switch from '@smui/switch';
    import Avatar from '../Avatar.svelte';
    import Alert from "./../Alert.svelte"
    import type { SnackbarComponentDev } from '@smui/snackbar';
    import { STORE_newAlert } from '../../stores';
    import CircularProgress from '@smui/circular-progress';

    export let selectedGroup
    export let chatScreenComponent

    let snackbar: SnackbarComponentDev
    let alertText: string = ""
    let alertObject = null
    let alertClass: string = "dangerous"

    let channelName = '';
    let invalidChannelName = false
    let duplicateChannel = false

    let groupMembers = selectedGroup.members
    let addedMembers = []
    let working = false

    onMount(async () => {
        working = true
        try {
            groupMembers = await ApiRequest.groupGetMembers(selectedGroup._id)
            selectedGroup.members = groupMembers 
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Group member error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
	});

    async function checkChannelName() {
        try {
            invalidChannelName = !(validateChannelName(channelName))
            if (!invalidChannelName) {
                duplicateChannel = await existingChannelName(selectedGroup._id, channelName)
            } else {
                duplicateChannel = false
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Channel name check error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
    }

    function toggleMember(event, id) {
        if (event.detail.selected) {
            addedMembers.push({
                _id: id,
                active: true,
                admin: false
            })
        } else {
            let index = addedMembers.findIndex( (member) => {
                return (member._id === id)
            })
            if (index>=0) {
                addedMembers.splice(index, 1)
            }
        }
    }

    async function createChannel() {
        working = true
        try {
            checkChannelName()
            if (!invalidChannelName && !duplicateChannel) {
                let result = await ApiRequest.channelPostCreate(channelName, selectedGroup._id, addedMembers, null);
                if (result && result._id) {
                    result.admin = true // Creator is admin of the new channel 
                    selectedGroup.channelInfo.push(result)
                    $STORE_newAlert = {
                        alertText: "The new channel has been created.",
                        alertObject: null,
                        alertClass: "info"
                    }
                    chatScreenComponent = Chat
                } else {
                    console.error("Invalid result when trying to xreate the channel.")
                    $STORE_newAlert = {
                        alertText: "The channel could not be created due to an error.",
                        alertObject: null,
                        alertClass: "dangerous"
                    }
                }
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "",
                alertObject: null || err,
                alertClass: "info || warning || dangerous"
            }
        }
        working = false
    }

</script>

<form on:submit|preventDefault={createChannel}>
    <div>
        <Textfield variant="outlined" bind:value={channelName} label="Channel Name" type="text" required on:blur={checkChannelName}>
			<ClearField slot="trailingIcon" bind:variable={channelName} />
        </Textfield>
        <div id="channel-error" class="input_error" class:invalid="{invalidChannelName}">Channel names must have at least {MINIMUM_CHANNEL_NAME_LENGTH} characters <br> and contain no spaces.</div>
        <div id="channel-exists" class="input_error" class:invalid="{duplicateChannel}">The channel name already exists within the group. Please choose another name.</div>
    </div>
    <div>
        <List class="user-list" avatarList>
            {#each selectedGroup.members as member, i}
                {#if member._id != localStorage.getItem("_id")}
                    <Item>
                        <Graphic>
                            <Avatar object={member} />
                        </Graphic>
                        <Text>
                            {#if member.name}
                                <PrimaryText>({member.username}) {member.name} - {member.email}</PrimaryText>
                            {:else}
                                <PrimaryText>{i}: Retrieving ... </PrimaryText>
                            {/if}
                        </Text>
                        <Meta class="member-buttons">
                            <FormField>
                                    <Switch bind:checked={member.inChannel} on:SMUISwitch:change={(event) => { toggleMember(event, member._id) } } />
                            </FormField>
                        </Meta>
                    </Item>
                {/if}
            {/each}
        </List>
    </div>
    <div class:hidden={working}>
        <Button color="primary" variant="raised" type="submit">
            <Label>Create</Label>
        </Button>
    </div>
    <div class:hidden={!working}>
        <CircularProgress style="height: 32px; width: 32px;" indeterminate />
    </div>
    <div>
        <Button color="primary" on:click={() => {chatScreenComponent=GroupSettings}} type="button">
            <Label>Back</Label>
    	</Button>
    </div>        
</form>

<style lang="scss">
	div {
		margin-bottom: 1rem;
	}
    * :global(.mdc-deprecated-list--avatar-list .mdc-deprecated-list-item__primary-text) {
	    margin-bottom: 0; /* Fix issue with text in avatar lists getting cut off at the bottom */
    }
</style>
