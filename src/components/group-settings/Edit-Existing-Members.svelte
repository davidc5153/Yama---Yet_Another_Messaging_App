<script lang="ts">
    import List, { Item, Meta, Text, Graphic, PrimaryText } from '@smui/list';
    import Avatar from '../Avatar.svelte';
    import Button, { Icon, Label } from '@smui/button';
    import ApiRequest from '../../lib/api';
    import { STORE_newAlert } from '../../stores';
    import CircularProgress from '@smui/circular-progress';

    export let selectedGroup
    export let selectedChannel

    let working = false

    async function removeMember(id) {
        working = true
        try {
            let result = await ApiRequest.groupPatchMember(selectedGroup._id, id)

            // Remove the member from the channel if open
            // Triggers update of selectedGroup.channelInfo in Chat.svelte
            if (selectedChannel && selectedChannel.members) {
                let foundMember = selectedChannel.members.find( (member) => {
                    return member._id == id
                })
                if (foundMember) {
                    foundMember.active = false
                }
                selectedChannel = selectedChannel // Force reative refresh
            }

            // Remove the member from selectedGroup.members
            // Triggers update of groups[] in Chat.svelte
            if (selectedGroup.members) {
                let foundMember = selectedGroup.members.find( (member) => {
                    return member._id == id
                })
                if (foundMember) {
                    foundMember.active = false
                }
                selectedGroup = selectedGroup // Force reative refresh
            }
            $STORE_newAlert = {
                alertText: "The member has been removed from the group.",
                alertObject: null,
                alertClass: "info"
            }
        } catch (err) {
            $STORE_newAlert = {
                alertText: "Group member removal error.",
                alertObject: err,
                alertClass: "dangerous"
            }
        }
        working = false
    }

</script>

<h2>Edit the existing members of the group</h2>
{#if selectedGroup && selectedGroup.members && selectedGroup.members.length > 0}
    <div id="user-list-area">
        <List class="user-list" avatarList>
            {#each selectedGroup.members as member, i}
                {#if member.active && member._id != localStorage.getItem("_id")}
                    <Item>
                        {#if member.name}
                            <Graphic>
                                <Avatar object={member} />
                            </Graphic>
                            <Text>
                                    <PrimaryText>({member.username}) {member.name} - {member.email}</PrimaryText>
                            </Text>
                        {:else}
                            <Text>
                                <PrimaryText>{i}: Retrieving ... </PrimaryText>
                            </Text>
                        {/if}
                        <Meta class="member-buttons">
                            <div class:hidden={working}>
                                <Button color="primary" variant="raised" on:click={() => removeMember(member._id)} type="button" >
                                    <Label>Remove</Label>
                                </Button>
                            </div>
                            <div class:hidden={!working}>
                                <CircularProgress style="height: 32px; width: 32px;" indeterminate />
                            </div>
                        </Meta>
                    </Item>
                {/if}
            {/each}
        </List>
    </div>
{:else}
    No members found for the selected group
{/if}

<style lang="scss">
    div#user-list-area {
        overflow-y: auto;
        max-height: 26em;
    }
    * :global(.mdc-deprecated-list--avatar-list .mdc-deprecated-list-item__primary-text) {
	    margin-bottom: 0; /* Fix issue with text in avatar lists getting cut off at the bottom */
    }
</style>