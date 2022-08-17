<script lang="ts">
    import List, { Item, Meta, Text, Graphic, PrimaryText } from '@smui/list';
    import FormField from '@smui/form-field';
    import Switch from '@smui/switch';
    import ApiRequest from '../../lib/api';
    import { onMount } from 'svelte';
    import Avatar from '../Avatar.svelte';
    import { STORE_newAlert } from './../../stores';

    export let selectedGroup
    export let selectedChannel
    
    onMount(async () => {
        try {
            let groupMembers = await ApiRequest.groupGetMembers(selectedGroup._id)
            for (let index = 0; index < groupMembers.length; index++) {
                const groupMember = groupMembers[index];
                let found = selectedChannel.members.findIndex( (channelMember) => {
                    return ( (channelMember._id == groupMember._id) && (channelMember.active === true) )
                })
                if (found >= 0) {
                    groupMember.inChannel = true
                } else {
                    groupMember.inChannel = false
                }
            }
            selectedGroup.members = groupMembers
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Group members error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
	});

    async function toggleMember(event, member) {
        // NB: selectedGroup.members.inChannel is updated automatically due to being bound to the control
        if (event.detail.selected) {
            // Add member to channel
            try {
                let newMembers = await ApiRequest.channelPutMember(selectedChannel._id, member._id)
                if (newMembers && Array.isArray(newMembers) && newMembers.length == selectedChannel.members.length + 1) {
                    // New member successfully added to the channel in the DB
                    selectedChannel.members = newMembers
                } else {
                    console.error("Error adding member to the channel")
                    $STORE_newAlert = {
                        alertText: "Unable to add the member to the channel due to an error.",
                        alertObject: null,
                        alertClass: "dangerous"
                    }
                }
            } catch (err) {
                console.error("Error adding member to the channel")
                member.inChannel = false
                selectedGroup = selectedGroup
                $STORE_newAlert = {
                    alertText: "Channel member add error.",
                    alertObject: err,
                    alertClass: "dangerous"
                }
            }
        } else {
            // Remove member from the channel
            try {
                let newMembers = await ApiRequest.channelPatchMember(selectedChannel._id, member._id)
                if (newMembers && Array.isArray(newMembers) && newMembers.length == selectedChannel.members.length - 1) {
                    // Member successfully removed from the channel in the DB
                    selectedChannel.members = newMembers
                } else {
                    console.error("Error removing the member from the channel")
                    $STORE_newAlert = {
                        alertText: "Unable to remove the member form the channel due to an error",
                        alertObject: null,
                        alertClass: "dangerous"
                    }
                }
            } catch (err) {
                console.error("Error removing the member from the channel")
                member.inChannel = true
                selectedGroup = selectedGroup
                $STORE_newAlert = {
                    alertText: "Channel member removal error.",
                    alertObject: err,
                    alertClass: "dangerous"
                }
            }
        }
    }


</script>

<h3>Modify Channel Members</h3>
<div>
    {#if selectedGroup.members.length > 0}
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
                                {#if member && member.hasOwnProperty("inChannel")}
                                    <Switch bind:checked={member.inChannel} on:SMUISwitch:change={(event) => { toggleMember(event, member) } } />
                                {/if}
                            </FormField>
                        </Meta>
                    </Item>
                {/if}
            {/each}
        </List>
    {:else}
        <p>You have no members in the group.</p>
        <p>You add members to this channel, please first invite members to the group.</p>
    {/if}
</div>

<style lang="scss">
    * :global(.mdc-deprecated-list--avatar-list .mdc-deprecated-list-item__primary-text) {
	    margin-bottom: 0; /* Fix issue with text in avatar lists getting cut off at the bottom */
    }
</style>