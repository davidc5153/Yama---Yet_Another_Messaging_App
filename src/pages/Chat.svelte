<script lang="ts">

    /**
     * The main Chat page for YaMa
     * 
     */

    const MAX_CHANNEL_AGE = 1; // Minutes - Opening channel after this time will trigger a new fetch from the server
    const MESSAGE_REFRESH_DELAY = 5 // seconds
    const newMessageAudio = new Audio('mixkit-message-pop-alert-2354.mp3');

    import { STORE_chatPanelOpen, STORE_newAlert, STORE_showingFriends } from "../stores";
    import { fade } from 'svelte/transition';
    import IconButton, { Icon } from "@smui/icon-button";
    import Badge from '@smui-extra/badge';
    import { Input, TextareaComponentDev} from "@smui/textfield";
    import Fab from "@smui/fab";
    import ApiRequest from "../lib/api";
    import { beforeUpdate, afterUpdate, onMount } from "svelte";
    import Chat from "./../components/Chat.svelte";
    import Tooltip from "./../components/Tooltip.svelte"
    import AddGroup from "../components/group-settings/Add-Group.svelte";
    import GroupSettings from "../components/Group-Settings.svelte";
    import ChannelSettings from "./../components/Channel-Settings.svelte";
    import AddChannel from "./../components/group-settings/Add-Channel.svelte"
    import GroupManageMembers from '../components/group-settings/Remove-Members.svelte';
    import Friends from "./../components/Friends.svelte"
    import InviteMembers from "./../components/group-settings/Invite-Members.svelte"
    import Avatar from '../components/Avatar.svelte';
    import YamaEncryption from "../lib/encryption";
    import type { NotchedOutlineComponentDev } from '@smui/notched-outline';
    import type { FloatingLabelComponentDev } from '@smui/floating-label';
    import List, { Item, Text } from "@smui/list";
    import Paper from "@smui/paper";
    import AvatarLetter from "../components/Avatar-Letter.svelte";
    import FriendsList from "../components/Friends/Friends-List.svelte";
    import ConfirmDelete from "../components/Confirm-Delete.svelte"
    import RecordRTC from "recordrtc"
    import Close from "./../components/Close.svelte"
    import Alert from "./../components/Alert.svelte"
    import type { SnackbarComponentDev } from '@smui/snackbar';
    import CircularProgress from '@smui/circular-progress';

    let chatInput: TextareaComponentDev;
    let chatInputNotchedOutline: NotchedOutlineComponentDev;
    let chatInputfloatingLabel: FloatingLabelComponentDev;

    let chatScreenComponent: any = Chat;
    let chatMessage: string = "";
    let previousMessage: string = "";

    let recordedAudio: Blob
    let mediaStream = null
    let mediaRecorder = null;
    let audioCountdown = 10
    let countdownHidden = true
    let countdownTimer
    let chatScreen = null
    let autoScroll = false
    let newMessage = false

    let groups
    let selectedGroup = null
    let selectedChannel = null
    let messageTextboxDisabled = true
    let loadMessagesInterval
    let currentFriend = null
    let deleteType: string
    
    let tooltipX:Number = 0
    let tooltipY:Number = 0
    let tooltipText:string = ""
    let tooltipHidden:boolean = true
    let tooltipHighlight: boolean = false

    let snackbar: SnackbarComponentDev
    let alertText: string = ""
    let alertObject = null
    let alertClass: string = "dangerous"

    $STORE_chatPanelOpen = false
    $STORE_showingFriends = false

    onMount(async () => {
        // Load the group info
        await getGroupInfo();
        // Prepare Audio ...
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new RecordRTC(mediaStream, { type: "audio" });
        } catch (err) {
            console.error("Error trying to save MediaRecorder data to an AWS S3 bucket.", err)
            alertText = "Audio error."
            alertObject = err
            alertClass = "dangerous"
            snackbar.open()
        }
    });

    beforeUpdate(()=>{
        if(chatScreenComponent == Chat && chatScreen && Math.abs(chatScreen.scrollHeight - chatScreen.scrollTop - chatScreen.clientHeight) < 5) {
            autoScroll = true; // Auto-scroll if the user is already at the bottom
        } else {
            autoScroll = false
        }
    })

    afterUpdate(()=>{
        if (autoScroll && Math.abs(chatScreen.scrollHeight - chatScreen.scrollTop - chatScreen.clientHeight) > 5) {
            chatScreen.scrollTo({
                left: 0, 
                top: chatScreen.scrollHeight,
                behavior: 'smooth'
            });
        }
        if (newMessage) {
            // https://mixkit.co/free-sound-effects/notification/
            newMessageAudio.play()
            newMessage = false
        }
    })
   
    $: if (selectedChannel) {
        console.info("Selected channel changed!")
        let channelIndex = selectedGroup.channelInfo.findIndex( (channel) => {
            return channel._id == selectedChannel._id
        })
        if (channelIndex >= 0) {
            selectedGroup.channelInfo[channelIndex] = selectedChannel
            // if channel has changed make sure that messages are being retrieved
            // Could have been a friend group selection!
            if (!loadMessagesInterval) {
                loadMessages()
            }
        } else {
            console.error("Unable to find the channel information in the group.")
            alertText = "Channel information not found."
            alertObject = null
            alertClass = "dangerous"
            snackbar.open()
        }
    }

    $: if (selectedGroup) {
        console.info("Selected group changed!")
        if (selectedGroup) {
            if (selectedGroup.friend) {
                currentFriend = parseFriendFromGroup()
            } else {
                currentFriend = null
            }
            let groupIndex = groups.findIndex( (group) => {
                return group._id == selectedGroup._id
            })
            if (groupIndex >= 0) {
                groups[groupIndex] = selectedGroup
            } else {
                console.error("Unable to find the group information in the group list.")
                alertText = "Group information not found."
                alertObject = null
                alertClass = "dangerous"
                snackbar.open()
            }
        }
    }

    $: if (groups) {
        console.info("Groups list changed!")
        localStorage.setItem('groupInfo', JSON.stringify(groups))
    }

    $: if ($STORE_newAlert) {
        alertText = $STORE_newAlert.alertText
        alertObject = $STORE_newAlert.alertObject
        alertClass = $STORE_newAlert.alertClass
        snackbar.open()
        $STORE_newAlert = null
    }


    function loadMessages() {
        console.info("loading messages ...")
        clearInterval(loadMessagesInterval)
        fetchMessages()
        loadMessagesInterval = setInterval( async ()=>{
            fetchMessages()
        }, MESSAGE_REFRESH_DELAY*1000)
    }

    async function fetchMessages() {
        if (selectedChannel && localStorage.getItem("token")) {
            // Don't AWAIT - Will show cached messages while waiting for new message download
            if (selectedChannel.activeMessages && Array.isArray(selectedChannel.activeMessages) && selectedChannel.activeMessages.length>0) {
                ApiRequest.channelGetMessages(
                    selectedChannel._id, 
                    selectedChannel.activeMessages[selectedChannel.activeMessages.length-1].date
                ).then( (result) => {
                    if (result && Array.isArray(result) && result.length > 0) {
                        selectedChannel.activeMessages.push(...result)
                        selectedChannel = selectedChannel // Force reactive refresh
                        newMessage = true
                    }
                }).catch( (err) => {
                    if (localStorage.getItem("_id") && localStorage.getItem("_id")!="null") {
                        console.error("Error trying to retrieve new messages for the channel.", err)
                        alertText = "Messages update error."
                        alertObject = err
                        alertClass = "dangerous"
                        snackbar.open()
                    } else {
                        // User  has logged out - Stop fetching messages 
                        clearInterval(loadMessagesInterval)
                    }
                })
    
            } else {
                ApiRequest.channelGetMessages(selectedChannel._id).then( (result) => {
                    selectedChannel.activeMessages = result
                }).catch( (err) => {
                    console.error("Error trying to retrieve all messages for the channel.", err)
                    alertText = "Message error."
                    alertObject = err
                    alertClass = "dangerous"
                    snackbar.open()
                })
            }
        } else {
            // No channel selected or logged out - Stop the interval
            clearInterval(loadMessagesInterval)
        }
    }

    async function getGroupInfo() {
        if (!groups || !Array.isArray(groups) || groups.length == 0) {
            try {
                let cachedGroups = localStorage.getItem("groupInfo")
                if (cachedGroups && cachedGroups.length>0) {
                    groups = JSON.parse(cachedGroups)
                    console.info("Cached group data loaded!")
                }
            } catch (err) {
                console.error("Error parsing cached group data.", err);
                alertText = "Group error."
                alertObject = err
                alertClass = "dangerous"
                snackbar.open()
            }
        }
        // Do not AWAIT - Used cached data until the data comes through
        ApiRequest.groupGetAllInfo().then( (downloadedGroups) => {
            groups = downloadedGroups;
            localStorage.setItem("groupReadTime", new Date().getTime().toString());
            console.info("Group data updated!")
        }).catch( (err) => {
            console.error("Error fetching group data.", err)
            alertText = "Group load error."
            alertObject = err
            alertClass = "dangerous"
            snackbar.open()
        })
            
    }

    function openChat() {
        $STORE_chatPanelOpen = true
        // document.getElementById("chat-panel").style.width = "100%";
    }

    function closeChat() {
        $STORE_chatPanelOpen = false
        // document.getElementById("chat-panel").style.width = "0";
    }

    function toggleAddGroup() {
        messageTextboxDisabled = true;
        if (chatScreenComponent != AddGroup) {
            chatScreenComponent = AddGroup;
        } else {
            chatScreenComponent = Chat;
        }
	    openChat();
    }

    function toggleGroupSettings() {
        messageTextboxDisabled = true;
        if (chatScreenComponent != GroupSettings) {
            chatScreenComponent = GroupSettings;
        } else {
            chatScreenComponent = Chat;
        }
	    openChat();
    }

    function toggleChannelSettings(event) {
        event.stopPropagation()
        messageTextboxDisabled = true;
        if (chatScreenComponent != ChannelSettings) {
            chatScreenComponent = ChannelSettings;
        } else {
            chatScreenComponent = Chat;
        }
	    openChat();
    }    
    
    async function getChannelInfo(index) {
        messageTextboxDisabled = true;
        try {
            let currentGroup = groups[index];
            selectedGroup = currentGroup;
            if (selectedGroup.friend == true) {
                $STORE_showingFriends = true
            } else {
                $STORE_showingFriends = false
            }
            if (currentGroup.channels && Array.isArray(currentGroup.channels)) {
                if ( !currentGroup.channelReadTime || new Date().getTime() - parseInt(currentGroup.channelReadTime, 10) > MAX_CHANNEL_AGE * 60 * 1000) {
                    // Don't AWAIT - Fetch latest data Async
                    ApiRequest.channelGetAllInfo(currentGroup._id).then( (result) => {
                        currentGroup.channelInfo = result.channels;
                        currentGroup.channelReadTime = new Date().getTime().toString();
                        selectedGroup = currentGroup;
                    })
                }
            }
            if (chatScreenComponent != Chat) {
                chatScreenComponent = Chat;
            }
            selectedChannel = null;
        } catch (err) {
            console.error("Error retrieving channel information", err);
            alertText = "Channel load error."
            alertObject = err
            alertClass = "dangerous"
            snackbar.open()
        }
    }

    async function selectChatChannel(index) {
        try {
            messageTextboxDisabled = false
            openChat();
            if (chatScreenComponent != Chat) {
                chatScreenComponent = Chat;
            }
            // Get channel details and messages
            selectedChannel = selectedGroup.channelInfo[index]; // Set to values already loaded
            ApiRequest.channelGetInfo(selectedChannel._id).then( (result) => {
                selectedGroup.channelInfo[index] = result
                selectedChannel = selectedGroup.channelInfo[index]; // Set to updated values
                loadMessages()
            })
            // Schedule future message loads
            loadMessages()
        } catch (err) {
            console.error('Error trying to retrieve channel information.', err)
            alertText = "Channel selection error."
            alertObject = err
            alertClass = "dangerous"
            snackbar.open()
        }
    }

    async function sendMessage(event?:SubmitEvent, message?:string) {
        if (!message) {
            message = chatMessage
        }
        if (message) {
            if (localStorage.getItem("pubKey") && localStorage.getItem("privKey")) {
                encryptMessage(message).then( (encryptedMessage: EncryptedMessage) => {
                    sendMessageToDB(encryptedMessage)
                }).catch( (err) => {
                    console.error("Error encrypting the message.")
                    alertText = "Encryption error."
                    alertObject = err
                    alertClass = "dangerous"
                    snackbar.open()
                })
            } else {
                console.error("Error retrieving the encryption keys for the logged in user. Message will be saved unencrypted.")
                alertText = "You do not have valid encryption keys. Your messages will be sent unencrypted."
                alertObject = null
                alertClass = "warning"
                snackbar.open()
                sendMessageToDB(message)
            }
        }
    }

    async function sendMessageToDB(message) {
        ApiRequest.channelPostMessage(selectedChannel._id, message).then( (result:boolean) => {
            if (result === true) {
                chatMessage = null;
                loadMessages()
            } else {
                console.error("Unable to send the message.")
                alertText = "Your message has failed to send."
                alertObject = null
                alertClass = "dangerous"
                snackbar.open()
            }
        }).catch( (err) => {
            console.error("Error sending the message to the server.", err)
            alertText = "Message send error."
            alertObject = err
            alertClass = "dangerous"
            snackbar.open()
        })
    }

    async function encryptMessage(message: string): Promise<EncryptedMessage> {
        const userPublicKeyArray: JsonWebKey[] = [];
        const activeUserPublicKey: JsonWebKey = JSON.parse(localStorage.getItem("pubKey"));
        const activeUserPrivateKey: JsonWebKey = JSON.parse(localStorage.getItem("privKey"));

        // Add sending users public key
        if (!selectedChannel.name) {
            // MAIN channel, use all members of the group
            selectedChannel.groupMembers.forEach((member) => {
                console.log(member)
                userPublicKeyArray.push(member.pubKey);
            });
        } else {
            // Use members of the channel
            selectedChannel.channelMembers.forEach((member) => {
                console.log(member)
                userPublicKeyArray.push(member.pubKey);
            });
        }

        const encryptedChatMessage = await YamaEncryption.createYaMaMessage(message, userPublicKeyArray, activeUserPublicKey, activeUserPrivateKey)
        return encryptedChatMessage
    }

    function recordAudioStart(event) {
        event.preventDefault()
        if (!messageTextboxDisabled) {
            clearInterval(countdownTimer)
            countdownHidden = false
            mediaRecorder.startRecording();
            previousMessage = chatMessage
            chatMessage = "Recording Audio." 
            countdownTimer = setInterval(() => {
                if (audioCountdown == 0) {
                    recordAudioStop(event)
                }
                audioCountdown--
                chatMessage = audioCountdown + " seconds remaining for audio recording." 
             }, 1000)
        }
    }

    async function recordAudioStop(event){
        event.preventDefault()
        try {
            if (!messageTextboxDisabled) {
                chatMessage = previousMessage
                clearInterval(countdownTimer)
                audioCountdown = 10
                countdownHidden = true
                if (mediaRecorder.getState() == "recording") {
                    mediaRecorder.stopRecording( async () => {
                        recordedAudio = mediaRecorder.getBlob();
                        let result = await ApiRequest.uploadFile("audio/webm", recordedAudio)
                        if (result) {
                            // Saved to S3 bucket, now add to message
                            sendMessage(null, `<audio controls src="${result}">Audio element is not supported by your browser.</audio>`)
                        } else {
                            console.error("Error uploading the audio file.")
                            alertText = "Audio upload error."
                            alertObject = null
                            alertClass = "dangerous"
                            snackbar.open()
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Error recording audio", err)
            alertText = "Audio recording error."
            alertObject = err
            alertClass = "dangerous"
            snackbar.open()
        }
	}

    async function toggleFriends() {
        if (chatScreenComponent === Friends) {
            chatScreenComponent = Chat
            $STORE_showingFriends = false        
        } else {
            selectedChannel = null
            selectedGroup = null
            chatScreenComponent = Friends
            $STORE_showingFriends = true        
        }
    }

    async function inviteFriend() {
        chatScreenComponent = InviteMembers
        openChat()
    }

    function parseFriendFromGroup() {
        // let title = selectedGroup.name.split("$").pop()
        if (selectedGroup && selectedGroup.friend && selectedGroup.members && Array.isArray(selectedGroup.members)) {
            let friend = selectedGroup.members.find( (member) => {
                return member._id != localStorage.getItem("_id")
            })
            if (friend) {
                return friend 
            }
        }
        return null
    }

    function leaveChannel(event) {
        event.stopPropagation()
        deleteType = "CHANNEL"
        chatScreenComponent = ConfirmDelete
    }   

    function leaveGroup(event) {
        event.stopPropagation()
        deleteType = "GROUP"
        chatScreenComponent = ConfirmDelete
    }   

    function tooltip(enter, event) {
        if (enter) {
            tooltipText = event.target.dataset.tooltip
            try {
                if (event.target.classList[0].startsWith("group-")) {
                    tooltipHighlight = false
                } else {
                    tooltipHighlight = true
                }                
            } catch (err) {
                console.warn("Error getting tooltip event classList.", err)
                tooltipHighlight = false
            }
            tooltipHidden = false
        } else {
            tooltipHidden = true
        }
    } 
    
    function clearChatMessageInput(event) {
        chatMessage = ""
        try {RecordRTC
            event.target.parentElement.parentElement.firstChild.focus();
        } catch (err) {
            console.warn("Error passing focus to the chat message input.", err)
        }
    }

</script>

<div>
    <div id="grid-container">
        <Tooltip hidden={tooltipHidden} highlight={tooltipHighlight} x={tooltipX} y={tooltipY} text={tooltipText} />
        <div id="side">
            <div id="side-bar" on:mousemove="{ (e) => { tooltipX = e.clientX;  tooltipY = e.clientY; } }">
                <div class="flexy">
                    <div class="side-bar-margins">
                        {#if groups && Array.isArray(groups)}
                            <div id="add-group" on:mouseenter={(event) => tooltip(true, event)} on:mouseleave={(event) => tooltip(false, event)} data-tooltip="Add a New Group">
                                <Fab color="secondary" mini on:click={toggleAddGroup} class="avatar">
                                    <Icon class="material-icons">add</Icon>
                                </Fab>
                            </div>
                            <div id="goto-friends" on:mouseenter={(event) => tooltip(true, event)} on:mouseleave={(event) => tooltip(false, event)} data-tooltip="Friends">
                                <Fab color="secondary" mini on:click={toggleFriends} class="avatar">
                                    <Icon class="material-icons">group</Icon>
                                </Fab>
                            </div>
                            {#each groups as group, i}
                                {#if group && group.name && !group.friend}
                                    <div class="group-{group.name}" on:mouseenter={(event) => tooltip(true, event)} on:mouseleave={(event) => tooltip(false, event)} data-tooltip="{group.name}">
                                        <AvatarLetter object={group} on:click={async () => { getChannelInfo(i) }} selectedClass="{ (selectedGroup && (selectedGroup._id === group._id)) ? 'selected' : ''}"/>
                                    </div>
                                {/if}
                            {/each}
                        {:else}
                            <CircularProgress style="height: 32px; width: 32px;" indeterminate />
                        {/if}
                    </div>
                </div>
            </div>
            <div id="side-panel">
                {#if $STORE_showingFriends || (selectedGroup && selectedGroup.friend)}
                    <h3>
                        Friends
                        <span class="invite-friend">
                            <IconButton class="material-icons" touch on:click={inviteFriend}>add_circle</IconButton>
                        </span>
                    </h3>
                    <FriendsList bind:groups bind:selectedChannel bind:selectedGroup bind:chatScreenComponent bind:messageTextboxDisabled bind:deleteType />
                {:else}
                    {#if selectedGroup && selectedGroup.name}
                        <h3>
                            {selectedGroup.name}
                            {#if selectedGroup.admin}
                                <!-- Only show settings button IF user is admin of the group -->
                                <span class="group-settings-{selectedGroup.name}">
                                    <IconButton class="material-icons" touch on:click={toggleGroupSettings}>settings</IconButton>
                                </span>
                            {:else}
                                <!--Allow normal users to leave a group -->
                                <span class="leave-group-{selectedGroup.name}">
                                    <IconButton class="material-icons" touch on:click={leaveGroup}>cancel</IconButton>
                                </span>
                            {/if}
                        </h3>
                        {#if selectedGroup.channelInfo}
                            <List>
                                {#each selectedGroup.channelInfo as channel, i}
                                    <Item on:click={async () => { await selectChatChannel(i); }} style="padding-right: 0;justify-content: space-between;">
                                        <span class="channel-item" class:selected={selectedChannel && channel._id==selectedChannel._id}>
                                            <Text>
                                                <span class="channel-name">
                                                    {#if channel.name}
                                                        {channel.name}
                                                    {:else}
                                                        MAIN
                                                    {/if}
                                                </span>
                                            </Text>
                                        </span>
                                        {#if selectedChannel && channel._id == selectedChannel._id}
                                            {#if channel.admin===true}
                                                <!-- Only show settings button IF user is admin of the channel -->
                                                <span style="opacity: 0.6;">
                                                    <IconButton class="material-icons" touch on:click={toggleChannelSettings}>settings</IconButton>
                                                </span>
                                            {:else if channel.admin===false}
                                                <!--Allow normal users to leave a channel -->
                                                <span style="opacity: 0.6;">
                                                    <IconButton class="material-icons" touch on:click={leaveChannel}>cancel</IconButton>
                                                </span>
                                            {/if}
                                        {/if}
                                    </Item>
                                {/each}
                            </List>
                        {:else}
                            <CircularProgress style="height: 32px; width: 32px;" indeterminate />
                        {/if}
                    {:else}
                        <h3>Select a Group</h3>
                    {/if}
                {/if}
            </div>
        </div>
        <!-- ***** Chat Panel Content ***** -->
        <div id="chat-panel" class="side-chat" class:closed={!$STORE_chatPanelOpen}>
            <!-- ***** Chat Panel Header *****-->
            <div id="chat-header">
                {#if chatScreenComponent === AddGroup}
                    <h2>
                        <Fab color="primary" mini class="solo-fab"><Icon class="material-icons">add</Icon></Fab>    
                        Add a Group
                        <Close on:click={() => { chatScreenComponent=Chat; closeChat() }} />
                    </h2>
                {:else if chatScreenComponent === GroupSettings}
                    <h2>
                        <AvatarLetter object={selectedGroup} selectedClass="selected"/> 
                        Group Settings 
                        <Close on:click={() => {chatScreenComponent=Chat;}} />
                    </h2>
                {:else if chatScreenComponent === AddChannel}
                    <h2>
                        <Fab color="primary" mini class="solo-fab"><Icon class="material-icons">add</Icon></Fab>    
                        Add a Channel
                        <Close on:click={() => { chatScreenComponent = Chat; closeChat() }} />
                    </h2>
                {:else if chatScreenComponent === ChannelSettings}
                    <h2>
                        <AvatarLetter object={selectedGroup} selectedClass="selected" />
                        Channel Settings
                        {selectedGroup.name}
                        {#if selectedChannel.name}
                            / {selectedChannel.name}
                        {/if}
                        <Close on:click={() => { chatScreenComponent = Chat; closeChat() }} />
                    </h2>
                {:else if chatScreenComponent === GroupManageMembers}
                    <h2>
                        <Fab color="primary" mini class="solo-fab"><Icon class="material-icons">settings</Icon></Fab>    
                        Manage Group Members: <AvatarLetter object={selectedGroup} selectedClass="selected" />
                        {selectedGroup.name}
                        <Close on:click={() => { chatScreenComponent = Chat; }} />
                    </h2>
                {:else if chatScreenComponent === Friends}
                    <h2>
                        <Fab color="primary" mini class="solo-fab"><Icon class="material-icons">group</Icon></Fab>
                        YaMa Friends
                        <span class="chat-mobile-close" class:hidden={!$STORE_chatPanelOpen}><Close on:click={closeChat} /></span>
                    </h2>
                {:else if selectedGroup}
                    <h2>
                        {#if currentFriend}
                            <Avatar object={currentFriend} />
                            { currentFriend.username }
                        {:else}
                            <AvatarLetter object={selectedGroup} selectedClass="selected" />
                            {selectedGroup.name}
                            {#if selectedChannel && selectedChannel.name}
                                &nbsp;/&nbsp;{selectedChannel.name}
                            {/if}
                        {/if}
                        <span class="chat-mobile-close" class:hidden={!$STORE_chatPanelOpen}><Close on:click={closeChat} /></span>
                    </h2>
                {:else}
                    <h2>
                        <Fab color="primary" mini class="solo-fab"><Icon class="material-icons">chat</Icon></Fab>    
                        YaMa Chat
                        {#if chatScreenComponent != Chat}
                            <Close on:click={() => { chatScreenComponent = Chat; closeChat(); }} />
                        {/if}
                    </h2>
                {/if}
            </div>
            <!-- *** Chat messager Display area *** -->
            <!-- ********************************** -->
            <div id="chat-screen" bind:this={chatScreen}>
                <svelte:component
                    this={chatScreenComponent}
                    bind:chatScreenComponent
                    bind:selectedGroup
                    bind:selectedChannel
                    bind:groups
                    bind:deleteType
                    bind:messageTextboxDisabled
                />
            </div>
            <!-- ********************************** -->
            <!-- *** CHAT Input *** -->
            <form on:submit|preventDefault={sendMessage}>
                <div class="solo-container input" class:recording={!countdownHidden} class:hidden={messageTextboxDisabled}>
                    <Paper class="solo-paper" elevation={6}>
                        <Input id="chat-message" bind:value={chatMessage} disabled={messageTextboxDisabled} placeholder="Chat message ..." class="solo-input" />
                        <span style="cursor: pointer; opacity: 0.5; margin-top: 3px;" on:click={clearChatMessageInput}>
                            <Icon class="material-icons" style="vertical-align: sub;">cancel</Icon>
                        </span>
                    </Paper>
                    <!-- https://stackoverflow.com/questions/2825856/html-button-to-not-submit-form -->
                    <Fab color="secondary" mini class="solo-fab" type="button" on:pointerdown={recordAudioStart} on:pointerup={recordAudioStop} disabled={messageTextboxDisabled}>
                        <Icon class="material-icons">keyboard_voice</Icon>
                        <span class:countdown-hidden = {countdownHidden} transition:fade>
                            <Badge align="top-start" aria-label="seconds left"><span transition:fade>{audioCountdown}</span></Badge>
                        </span>
                    </Fab>
                    <Fab color="primary" mini class="solo-fab" type="submit" disabled={messageTextboxDisabled}>
                        <Icon class="material-icons">send</Icon>
                    </Fab>
                </div>
            </form>
        </div>
    </div>
</div>

<Alert bind:alert={snackbar} alertText={alertText} alertObject={alertObject} alertClass={alertClass} />

<style type="text/scss">
    @import "@material/theme/mixins";
    div {
        margin: 0;
    }
    h2 {
        padding: 10px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        max-width: 80%;
        margin-left: auto;
        margin-right: auto;
    }
    h3 {
        padding-left: 16px; 
        display: flex;
        flex-direction: row; 
        align-items: center; 
        justify-content: space-between;
    }
    #grid-container {
        display: grid;
        /* 2 column layout. width for side and main div.*/
        grid-template-columns: 325px auto;
        /* 100% view height minus header */
        height: calc(100vh - 48px);
    }
    #side,
    #side-panel,
    #chat-screen {
        overflow-y: scroll;
    }
    #side-bar {
        overflow-y: scroll;
        box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2),0px 6px 10px 0px rgba(0, 0, 0, 0.14),0px 1px 18px 0px rgba(0,0,0,.12);
    }
    .hidden {
        visibility: hidden;
    }

    #side::-webkit-scrollbar,
    #side-bar::-webkit-scrollbar,
    #side-panel::-webkit-scrollbar {
        display: none;
    }

    ::-webkit-scrollbar {
        width: 8px;
    }

    ::-webkit-scrollbar-thumb {
        background: #cdb96a;
    }

    .scroller {
        scrollbar-width: thin;
    }
    
    #side {
        display: grid;
        /* 2 column layout. width for side nav and side panel.*/
        grid-template-columns: 90px auto;
        gap: 0;
    }
    #side-panel {
        text-align: left;
    }
    #chat-panel {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
        overflow: hidden;
    }
    #chat-screen {
        height: 100%;
        padding: 1rem;
    }

    #chat-header {
        /* padding: 0.5em; */
        height: 10rem;
        overflow: hidden;
    }
    .input {
        padding: 10px;
        text-align: left;
    }
    .countdown-hidden {
        display: none
    }
    .recording {
        background-color: rgba(255, 0, 0, 0.5);
    }

    /* Mobile responsiveness settings upto a width of 700px */
    @media screen and (max-width: 700px) {
        #chat-panel.closed {
            width: 0;
        }
        #grid-container {
            /* Change from 2 column layout to 1 */
            grid-template-columns: auto;
        }
        #chat-screen {
            height: calc(100vh - 64px - 59px);
        }

        .side-chat {
            height: 100%;
            width: 100%;
            position: fixed;
            z-index: 1;
            top: 0;
            right: 0;
            overflow-x: hidden;
            transition: 0.5s;
        }

        #chat-header {
            margin-top: 48px;
        }
    }

    #side,
    #side-panel,
    #side-bar{
        scrollbar-width: none;
    }

    .solo-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px 8px;
    }
    * :global(.solo-paper) {
        display: flex;
        align-items: center;
        flex-grow: 1;
        max-width: 1200px;
        margin: 0 12px;
        padding: 0 12px;
        height: 48px;
    }
    * :global(.channel-paper) {
        min-height: calc(100% - 65px);
    }
    * :global(.solo-paper > *) {
        /* display: inline-block; */
        margin: 0 0px;
    }
    * :global(.solo-input) {
        flex-grow: 1;
    }
    * :global(.solo-input::placeholder) {
        opacity: 0.6;
    }
    * :global(.solo-fab) {
        flex-shrink: 0;
        margin: 0px 4px;
    }

    @media screen and (min-width: 700px) {
        .chat-mobile-close {
            display: none;
        }
    }

</style>
