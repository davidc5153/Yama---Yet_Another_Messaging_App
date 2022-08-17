<script lang="ts">
    import { onMount } from 'svelte';
    import Fab from "@smui/fab";
    import Paper from "@smui/paper";
    import { STORE_chatPanelOpen } from "../stores";
    import Avatar from "./Avatar.svelte";
    import Message from './Message.svelte';
    import CircularProgress from '@smui/circular-progress';

    export let selectedChannel;
    export let selectedGroup;
    export let messageTextboxDisabled
    if (selectedChannel) {
        messageTextboxDisabled = false
        $STORE_chatPanelOpen = true
    } else {
        messageTextboxDisabled = true
        $STORE_chatPanelOpen = false
    }
    
</script>

{#if selectedGroup && selectedChannel}
    <div>
        {#if selectedChannel.activeMessages && Array.isArray(selectedChannel.activeMessages)}
            {#each selectedChannel.activeMessages as message}
                {#if message.username == localStorage.getItem("username")}
                    <div style="text-align:right">
                        <div class="message-meta">
                            <div class="message-username mdc-typography--caption">
                                {message.username}
                            </div>
                        </div>
                        <Paper class="chat-message from">
                            <div class="mdc-typography--body2">
                                <Message message={message.message}/>
                            </div>
                        </Paper>
                        <div class="message-time mdc-typography--caption">
                            {new Date(Date.parse(message.date)).toLocaleString("en-AU")}
                        </div>
                    </div>
                {:else}
                    <div style="text-align:left">
                        <div class="message-meta">
                            <div class="message-username mdc-typography--caption">
                                {message.username}
                            </div>
                        </div>
                        <Paper class="chat-message to" color="primary">
                            <div class="mdc-typography--body2">
                                <Avatar object={message} />
                                <Message message={message.message}/>
                            </div>
                        </Paper>
                        <div class="message-time mdc-typography--caption">
                            {new Date(Date.parse(message.date)).toLocaleString("en-AU")}
                        </div>
                    </div>
                {/if}
                <br />
            {/each}
        {:else}
            <CircularProgress style="height: 32px; width: 32px;" indeterminate />
        {/if}
    </div>
{:else}
    <div>Select a group and a channel to start chatting</div>
{/if}
