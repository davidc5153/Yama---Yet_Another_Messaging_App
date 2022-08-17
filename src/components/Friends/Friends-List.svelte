<script lang="ts">
    import ApiRequest from "./../../lib/api";
    import List, { Item, Text, Graphic, PrimaryText, Meta } from "@smui/list";
    import IconButton, { Icon } from "@smui/icon-button";
    import Avatar from "./../Avatar.svelte";
    import Chat from "./../Chat.svelte"
    import ConfirmDelete from "./../Confirm-Delete.svelte"
    import Textfield from "@smui/textfield";
    import { STORE_chatPanelOpen } from "./../../stores"
    import ClearField from "../Clear-Field.svelte";
    import { STORE_newAlert } from  "./../../stores";
    import Friends from "../Friends.svelte";

    export let chatScreenComponent
    export let selectedGroup
    export let selectedChannel
    export let groups
    export let messageTextboxDisabled
    export let deleteType

    let filterText: string = ''
    
    async function selectFriend(friend) {
        if (friend) {
            // Only ever need to load the channel info once per session from the server as it will never change for a friend group
            if (chatScreenComponent != Friends) {
                chatScreenComponent = Friends
            }
            selectedChannel = null
            selectedGroup = friend
            $STORE_chatPanelOpen = true // Open the chat window
            if (friend.channels && Array.isArray(friend.channels) && friend.channels.length == 1) {
                // Download the channel information from the server - Only the first time
                try {
                    let channel = await ApiRequest.channelGetInfo(friend.channels[0])
                    if (channel && channel.group == friend._id) {
                        friend.channelInfo = [channel]
                        friend.channelReadTime = new Date().getTime().toString();
                        delete friend.channels
                    } else {
                        selectedGroup = null
                        console.error("Error retrieving the channel information for the friend group.")
                        $STORE_newAlert = {
                            alertText: "Unable to retrieving the friends group.",
                            alertObject: null,
                            alertClass: "dangerous"
                        }
                    }
                } catch (err) {
                    $STORE_newAlert = {
                        alertText: "Friend channel error.",
                        alertObject: err,
                        alertClass: "dangerous"
                    }
                }
            }
            if (friend.channelInfo && Array.isArray(friend.channelInfo) && friend.channelInfo.length == 1) {
                selectedChannel = friend.channelInfo[0]
                messageTextboxDisabled = false
                if (chatScreenComponent != Chat) {
                    chatScreenComponent = Chat
                }
            } else {
                selectedGroup = null
                console.error("Incorrect channel information found in the friend group.")
                $STORE_newAlert = {
                    alertText: "Invalid channel in the friend group.",
                    alertObject: null,
                    alertClass: "dangerous"
                }
            }
        } else {
            console.error("No friend group selected.")
            $STORE_newAlert = {
                alertText: "No friends group selected.",
                alertObject: null,
                alertClass: "dangerous"
            }
        }
    }

    async function removeFriend(event) {
        event.stopPropagation()
        deleteType = "GROUP"
        $STORE_chatPanelOpen = true
        chatScreenComponent = ConfirmDelete
    }
    
</script>

<div>
    <Textfield bind:value={filterText} label="Filter Friends" type="text" style="min-width: auto; margin: 0 1rem 1rem;">
        <ClearField slot="trailingIcon" bind:variable = {filterText} />
    </Textfield>
</div>
<List>
    {#each groups as group}
        {#if group && group.friend}
            {#each group.members as member}
                {#if ( (member._id != localStorage.getItem("_id")) && (member.username.toLowerCase().startsWith(filterText.toLowerCase())) ) }
                    <Item on:click={()=>{ selectFriend(group)}} style="padding-right: 0;justify-content: space-between;">
                        <Text>
                            <Avatar object={member} />
                            <span class="friend-list" class:selected={group == selectedGroup} >{member.username}</span>
                        </Text>
                        {#if group == selectedGroup}
                            <span style="opacity: 0.6;">
                                <IconButton class="material-icons" touch on:click={(event) => { removeFriend(event) }}>cancel</IconButton>
                            </span>
                        {/if}
                    </Item>
                {/if}
            {/each}
        {/if}
    {/each}
</List>
