<script lang="ts">

    import Button, { Label } from '@smui/button';
    import Icon from '@smui/textfield/icon';
    import ApiRequest from "./../lib/api"
    import Chat from "./Chat.svelte"
    import Friends from "./Friends.svelte"
    import { STORE_newAlert } from '../stores';
    import CircularProgress from '@smui/circular-progress';

    export let selectedGroup
    export let selectedChannel
    export let chatScreenComponent
    export let groups
    export let confirmDelete 
    export let deleteType

    let working = false

    const DOCUMENT_TYPE = {
        CHANNEL: { 
            admin: {
                html:   `<p>Are you sure you want to delete the channel from the group?</p>
                         <p>The channel, and the messages contained within it, will no longer be visible to any of the members.</p>`,
                button: 'Delete Channel'
            },
            user: {  
                html:   `<p>Are you sure you want to leave the selected channel?</p>
                         <p>The messages within the channel will no longer be visible to you.</p>`,
                button: 'Leave Channel'
            }
        },
        GROUP: {
            admin: {
                html:   `<p>Are you sure you want to delete the selected group?</p>
                         <p>The group, all it's channels and all the messages contained within those channels, will no longer be visible to any of the members.</p>`,
                button: 'Delete Group'
            },
            user: {
                html:   `<p>Are you sure you want to leave the selected group?</p>
                         <p>All the messages in every channel within the group will no longer be visible to you.</p>`,
                button: 'Leave Group'
            },
            friend: {
                html:   `<p>Are you sure you want to remove the selected friend?</p>
                         <p>The friends group and all the messages it contains will no longer be visible to you or your friend.</p>`,
                button: 'Remove Friend'
            }
        }
    }
    
    let documentType

    $: if (deleteType=="CHANNEL") {
        if (selectedChannel) {
            if (selectedChannel.admin) {
                documentType = DOCUMENT_TYPE.CHANNEL.admin
            } else {
                documentType = DOCUMENT_TYPE.CHANNEL.user
            }
        } else {
            console.error("No channel selected for delete.")
            $STORE_newAlert = {
                alertText: "There is no channel selected for deletion.",
                alertObject: null,
                alertClass: "dangerous"
            }
        }
    } else if (deleteType=="GROUP") {
        if (selectedGroup) {
            if (selectedGroup.friend) {
                documentType = DOCUMENT_TYPE.GROUP.friend
            } else if (selectedGroup.admin) {
                documentType = DOCUMENT_TYPE.GROUP.admin
            } else {
                documentType = DOCUMENT_TYPE.GROUP.user
            }
        } else {
            console.error("No group selected for deletion.")
            $STORE_newAlert = {
                alertText: "There is no group selected for deletion.",
                alertObject: null,
                alertClass: "dangerous"
            }
        }
    } else {
        console.error("Invalid delete type.")
        $STORE_newAlert = {
            alertText: "Invalid deletion type.",
            alertObject: null,
            alertClass: "dangerous"
        }
    }

    async function deactivateDocument() {
        working = true
        if (documentType == DOCUMENT_TYPE.GROUP.admin) {
            await deleteGroup()
        } else if (documentType == DOCUMENT_TYPE.GROUP.friend) {
            await deleteGroup()
        } else if (documentType == DOCUMENT_TYPE.CHANNEL.admin) {
            await deleteChannel()
        } else if (documentType == DOCUMENT_TYPE.GROUP.user) {
            await leaveGroup()
        } else if (documentType == DOCUMENT_TYPE.CHANNEL.user) {
            await leaveChannel()
        } else {
            console.error("Invalid delete document type.")
            $STORE_newAlert = {
                alertText: "Invalid type of document for deletion.",
                alertObject: null,
                alertClass: "dangerous"
            }
        }
        working = false
    }

    async function deleteGroup() {
        try {
            let result = await ApiRequest.groupDeleteDeactivate(selectedGroup._id)
            if (result) {
                _removeGroup()
                $STORE_newAlert = {
                    alertText: "The group has been deleted.",
                    alertObject: null,
                    alertClass: "info"
                }
            } else {
                console.error('Error deleting the group.')
                $STORE_newAlert = {
                    alertText: "Unable to dele the group due to an error.",
                    alertObject: null,
                    alertClass: "dangerous"
                }
            }
        } catch (err) {
            console.error(err)
            $STORE_newAlert = {
                alertText: "Delete group error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
    }

    function _removeGroup() {
        // Remove the deleted group from the groups array
        let groupIndex = groups.findIndex( (currentGroup) => {
            return currentGroup._id == selectedGroup._id
        })
        if (groupIndex >= 0) {
            let friend: boolean
            if (selectedGroup.friend===true) {
                friend = true
            } else {
                friend = false
            }
            groups.splice(groupIndex, 1)
            selectedChannel = null
            selectedGroup = null
            groups = groups // Force reactive Refresh
            if (friend) {
                chatScreenComponent = Friends
            } else {
                chatScreenComponent = Chat
            }
            $STORE_newAlert = {
                alertText: "The group has been removed.",
                alertObject: null,
                alertClass: "info"
            }
        } else {
            console.error("Error trying to remove the deleted group.")
            $STORE_newAlert = {
                alertText: "There was an error trying to remove the group.",
                alertObject: null,
                alertClass: "dangerous"
            }
        }
    }

    async function deleteChannel() {
        try {
            let result = await ApiRequest.channelDeleteDeactivate(selectedChannel._id)
            if (result) {
                confirmDelete = false // Close the "Confirm Delete" dialog in the parent page
                _removeChannel()
                $STORE_newAlert = {
                    alertText: "The channel has been deleted.",
                    alertObject: null,
                    alertClass: "info"
                }
            } else {
                console.error("Error trying to deleted the channel.")
                $STORE_newAlert = {
                    alertText: "There was an error trying to remove the channel.",
                    alertObject: null,
                    alertClass: "dangerous"
                }
            }
        } catch (err) {
            console.error(err)
            $STORE_newAlert = {
                alertText: "Delete channel error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
    }

    function _removeChannel() {
        // Remove the channel from the group
        let channelIndex = selectedGroup.channelInfo.findIndex( (channel) => {
            return channel._id == selectedChannel._id
        })
        if (channelIndex >= 0) {
            selectedGroup.channelInfo.splice(channelIndex, 1)
            selectedChannel = null
            chatScreenComponent = Chat
            $STORE_newAlert = {
                alertText: "The channel has been removed.",
                alertObject: null,
                alertClass: "info"
            }
        } else {
            console.error("Error trying to remove the deleted channel from the selected group.")
            $STORE_newAlert = {
                alertText: "There was an error trying to remove the channel.",
                alertObject: null,
                alertClass: "dangerous"
            }
        }
    }

    async function leaveGroup() {
        try {
            if (selectedGroup && localStorage.getItem("_id")) {
                let result = await ApiRequest.groupPatchMember(selectedGroup._id, localStorage.getItem("_id"))
                if (result && Array.isArray(result)) {
                    let memberIndex = result.findIndex( (member) => {
                        return ( (member._id == localStorage.getItem("_id")) && (member.active === true) )
                    })
                    if (memberIndex<0) {
                        // Member has been successfully removed in the DB
                        _removeGroup() // Remove from memory
                        $STORE_newAlert = {
                            alertText: "You have left the group.",
                            alertObject: null,
                            alertClass: "info"
                        }
                    }
                } else {
                    console.error('Error trying to leave the group.')
                    $STORE_newAlert = {
                        alertText: "Unable to leave the group due to an error.",
                        alertObject: null,
                        alertClass: "dangerous"
                    }
                }
            } else {
                console.error('No selected group or user data.')
                $STORE_newAlert = {
                    alertText: "Invalid group or user data.",
                    alertObject: null,
                    alertClass: "dangerous"
                }
            }
        } catch (err) {
            console.error(err)
            $STORE_newAlert = {
                alertText: "Leave group error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
    }

    async function leaveChannel() {
        try {
            if (selectedChannel && localStorage.getItem("_id")) {
                let result = await ApiRequest.channelPatchMember(selectedChannel._id, localStorage.getItem("_id"))
                if (result && Array.isArray(result)) {
                    let memberIndex = result.findIndex( (member) => {
                        return ( (member._id == localStorage.getItem("_id")) && (member.active === true) )
                    })
                    if (memberIndex<0) {
                        // Member has been successfully removed in the DB
                        _removeChannel() // Remove from memory
                        $STORE_newAlert = {
                            alertText: "You have left the channel.",
                            alertObject: null,
                            alertClass: "info"
                        }
                    }
                } else {
                    console.error('Error trying to leave the channel.')
                    $STORE_newAlert = {
                        alertText: "Unable to leave the channel due to an error.",
                        alertObject: null,
                        alertClass: "dangerous"
                    }
                }
            } else {
                console.error('No selected channel or user data.')
                $STORE_newAlert = {
                    alertText: "Invalid channel or user data.",
                    alertObject: null,
                    alertClass: "dangerous"
                }
            }
        } catch (err) {
            console.error(err)
            $STORE_newAlert = {
                alertText: "Leave channel error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
    } 

</script>

{#if documentType}
    <h3>{documentType.button} Confirmation</h3>
    <div class:hidden={working}>
        {@html documentType.html}
        <br>
        <Button color="primary" variant="raised" on:click={deactivateDocument} style="background: red;" type="button">
            <Icon class="material-icons">dangerous</Icon>
            <Label>{documentType.button}</Label>
        </Button>
    </div>
    <div class:hidden={!working}>
        <CircularProgress style="height: 32px; width: 32px;" indeterminate />
    </div>
{:else}
    <h3>ERROR</h3>
    <div>An error has occured</div>
{/if}

<style lang="scss">
    div {
        margin-bottom: 1rem;
    } 
</style>